import { GoogleGenAI, Type } from "@google/genai";
import { AiServiceResult, MealAnalysis } from "@/types";

/**
 * IMPORTANT: this must come from a real EXPO_PUBLIC_ env var, inlined into
 * the bundle at build time. There used to be a `Constants.expoConfig.extra`
 * fallback here reading from app.json - that was broken (app.json is static
 * JSON and can't evaluate `process.env.X`, so it was passing the literal
 * string "process.env.EXPO_PUBLIC_GEMINI_API_KEY" to Gemini whenever the env
 * var wasn't set, producing a confusing "API key not valid" 400). Removed
 * entirely rather than fixed, since a single source of truth for this value
 * is much harder to get wrong. See README section on EAS environment
 * variables for how to set this for local dev vs. EAS Build.
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

/**
 * Tried in order. If the first model is overloaded (503) or otherwise
 * unavailable, we fall through to the next one rather than failing outright.
 * Put your preferred/most-capable model first.
 */
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

const REQUEST_TIMEOUT_MS = 35000;
const MAX_RETRIES_PER_MODEL = 2; // total attempts per model = 1 + this
const BASE_BACKOFF_MS = 800;

const PROMPT =
  "You are an expert nutritionist and food vision AI. Analyze the attached food image carefully.\n\n" +
  "RULES - follow ALL of these exactly:\n" +
  "1. Identify every distinct food item visible in the image.\n" +
  "2. For EACH item, estimate a WEIGHT RANGE reflecting genuine uncertainty:\n" +
  "   - estimated_weight_min_g: lowest plausible weight in grams (pessimistic).\n" +
  "   - estimated_weight_max_g: highest plausible weight in grams (optimistic).\n" +
  "   - best_guess_weight_g: your single best point estimate within that range.\n" +
  "   The range must be non-trivial (min < best_guess < max) unless you can see a\n" +
  "   reference object (ruler, coin, hand) that lets you measure precisely.\n" +
  "3. Set weight_confidence_level:\n" +
  "   'high' - clear reference object present OR item has a well-known fixed size (egg, banana).\n" +
  "   'medium' - item is identifiable but depth/volume is partially obscured.\n" +
  "   'low' - significant uncertainty: liquid, curry in deep bowl, pile of mixed food.\n" +
  "4. Write confidence_explanation in 10 words or fewer explaining WHY that confidence level.\n" +
  "5. Calculate macros (calories, protein_g, carbs_g, fat_g) for best_guess_weight_g ONLY.\n" +
  "6. Set estimated_weight_g equal to best_guess_weight_g (kept for compatibility).\n" +
  "7. Set confidence_score (0-100): high=85, medium=60, low=35.\n" +
  "8. total_calories = sum of every item's best-guess calorie value.\n" +
  "9. Output ONLY valid JSON matching the required schema. No markdown, no extra prose.";

/**
 * Strict JSON schema Gemini must conform to. Mirrors the shape of
 * MealAnalysis in src/types/index.ts - keep the two in sync.
 */
const MEAL_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    meal_summary: { type: Type.STRING },
    total_calories: { type: Type.INTEGER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          food_name: { type: Type.STRING },
          // best_guess_weight_g is the canonical weight used for macros.
          // estimated_weight_g mirrors it for backward compatibility.
          estimated_weight_g: { type: Type.INTEGER },
          estimated_weight_min_g: { type: Type.INTEGER },
          estimated_weight_max_g: { type: Type.INTEGER },
          best_guess_weight_g: { type: Type.INTEGER },
          weight_confidence_level: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
          confidence_explanation: { type: Type.STRING },
          macros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.INTEGER },
              protein_g: { type: Type.INTEGER },
              carbs_g: { type: Type.INTEGER },
              fat_g: { type: Type.INTEGER },
            },
            required: ["calories", "protein_g", "carbs_g", "fat_g"],
          },
          confidence_score: { type: Type.INTEGER },
        },
        required: [
          "food_name",
          "estimated_weight_g",
          "estimated_weight_min_g",
          "estimated_weight_max_g",
          "best_guess_weight_g",
          "weight_confidence_level",
          "confidence_explanation",
          "macros",
          "confidence_score",
        ],
      },
    },
  },
  required: ["meal_summary", "total_calories", "items"],
};

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: API_KEY ?? "" });
  }
  return client;
}

/** Basic structural validation so a malformed/truncated response never
 * silently reaches the UI as if it were trustworthy data. */
function isValidMealAnalysis(value: unknown): value is MealAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.meal_summary !== "string") return false;
  if (typeof v.total_calories !== "number") return false;
  if (!Array.isArray(v.items)) return false;

  return v.items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const i = item as Record<string, unknown>;
    if (typeof i.food_name !== "string") return false;
    if (typeof i.estimated_weight_g !== "number") return false;
    if (typeof i.estimated_weight_min_g !== "number") return false;
    if (typeof i.estimated_weight_max_g !== "number") return false;
    if (typeof i.best_guess_weight_g !== "number") return false;
    if (!["low", "medium", "high"].includes(i.weight_confidence_level as string)) return false;
    if (typeof i.confidence_explanation !== "string") return false;
    if (typeof i.confidence_score !== "number") return false;
    if (typeof i.macros !== "object" || i.macros === null) return false;
    const m = i.macros as Record<string, unknown>;
    return (
      typeof m.calories === "number" &&
      typeof m.protein_g === "number" &&
      typeof m.carbs_g === "number" &&
      typeof m.fat_g === "number"
    );
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gemini surfaces "model overloaded" as a 503 with a message that usually
 * contains "overloaded" or "UNAVAILABLE". Different SDK versions expose the
 * status code differently, so we check a few likely spots defensively.
 */
function isOverloadedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status =
    (err as { status?: number; code?: number }).status ??
    (err as { code?: number }).code;
  if (status === 503) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("high demand")
  );
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  const msg = err.message.toLowerCase();
  return msg.includes("429") || msg.includes("rate limit") || msg.includes("quota");
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message === "TIMEOUT";
}

/** Genuine "device has no usable connection" errors - fetch/RN throw these
 * with varying wording depending on platform and failure point (DNS vs.
 * TCP vs. TLS). Distinguished from a slow-but-connected timeout so the
 * caller can offer "you're offline, this will be queued" rather than
 * "the AI service is having trouble." */
function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("no internet") ||
    msg.includes("internet connection")
  );
}

async function callModel(model: string, base64Image: string, mimeType: string) {
  const ai = getClient();
  return withTimeout(
    ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: MEAL_ANALYSIS_SCHEMA,
      },
    }),
    REQUEST_TIMEOUT_MS
  );
}

/**
 * Sends a base64-encoded food photo to Gemini and returns a structured
 * nutritional breakdown. Never throws - all failure modes resolve to
 * { success: false, error, code } so callers can render a friendly message
 * and decide whether to offer a retry, a different path (e.g. manual entry),
 * or both.
 *
 * Resilience strategy:
 *  - Per model, retry on overload/rate-limit errors with exponential
 *    backoff + jitter (does NOT retry on things like invalid API key or
 *    malformed JSON - those won't fix themselves).
 *  - If a model is still failing after its retries, fall through to the
 *    next model in MODEL_CHAIN (flash -> flash-lite -> 2.0-flash).
 *  - Only after every model in the chain has been exhausted do we report
 *    failure back to the caller.
 */
export async function analyzeMealImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<AiServiceResult> {
  if (!API_KEY) {
    return {
      success: false,
      code: "MISSING_KEY",
      error:
        "Missing Gemini API key. For local dev, set EXPO_PUBLIC_GEMINI_API_KEY in .env. For EAS builds, set it via `eas env:create` (see README).",
    };
  }

  let lastError: unknown = null;

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const response = await callModel(model, base64Image, mimeType);

        const rawText = response.text;
        if (!rawText) {
          return {
            success: false,
            code: "EMPTY_RESPONSE",
            error: "The AI returned an empty response. Please try again.",
          };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          return {
            success: false,
            code: "PARSE_ERROR",
            error: "The AI response wasn't valid JSON. Please retake the photo.",
          };
        }

        if (!isValidMealAnalysis(parsed)) {
          return {
            success: false,
            code: "INVALID_FORMAT",
            error:
              "The AI response didn't match the expected format. Please try again.",
          };
        }

        return { success: true, data: parsed, modelUsed: model };
      } catch (err) {
        lastError = err;
        // BUG FIX: timeouts used to be treated as non-retryable, so "Try
        // Again" always re-hit the exact same model with the exact same
        // timeout and failed the exact same way, forever. A slow response
        // is exactly the kind of transient failure retry+fallback exists
        // for - it's now retried with backoff, then falls through to the
        // next (often faster) model in the chain just like an overload.
        const retryable =
          isOverloadedError(err) || isRateLimitError(err) || isTimeoutError(err);
        const attemptsLeft = attempt < MAX_RETRIES_PER_MODEL;

        if (retryable && attemptsLeft) {
          // Exponential backoff with jitter: 800ms, 1600ms, ...
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 300;
          await sleep(backoff);
          continue; // retry same model
        }

        if (retryable) {
          // Exhausted retries for this model - try the next model in the chain.
          break;
        }

        if (isNetworkError(err)) {
          // No point retrying or falling through models - the device has
          // no usable connection right now. Distinct code so callers (the
          // camera screen, the pending-queue processor) can route this to
          // "save for later and retry when back online" instead of
          // treating it as an AI-service problem.
          return {
            success: false,
            code: "NETWORK_ERROR",
            error: "No internet connection. This will be saved and analyzed automatically once you're back online.",
          };
        }

        // Non-retryable error (bad request, malformed response, unknown) -
        // stop entirely.
        const message =
          err instanceof Error ? err.message : "Unknown error analyzing meal.";
        return {
          success: false,
          code: "UNKNOWN",
          error: `Couldn't analyze this photo: ${message}`,
        };
      }
    }
  }

  // Every model in the chain was overloaded/rate-limited/timed-out after
  // all retries.
  const timedOut = isTimeoutError(lastError);
  const isOverload = isOverloadedError(lastError);
  return {
    success: false,
    code: timedOut ? "TIMEOUT" : isOverload ? "OVERLOADED" : "UNKNOWN",
    error: timedOut
      ? "The AI is taking too long to respond right now. You can try again, save this for later, or enter it manually."
      : isOverload
      ? "Gemini is under heavy load right now and couldn't process this photo. You can try again in a bit, save it for later, or enter this meal manually."
      : "Couldn't analyze this photo after several attempts. You can try again, save it for later, or enter this meal manually.",
  };
}
