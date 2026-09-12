import { FoodItem, MealAnalysis, Macros } from "@/types";

// ---- Detection -------------------------------------------------------

/**
 * Keywords checked against food item names and the meal summary to decide
 * whether to show the oil estimation prompt. Kept intentionally broad:
 * false-positives (showing the prompt for a steamed dish) are annoying but
 * harmless - the user just picks "Light / Steamed". False-negatives (not
 * showing it for a butter-heavy curry) cause the exact calorie
 * underestimation this feature exists to fix.
 */
const OIL_TRIGGER_KEYWORDS = [
  // Cooking method cues
  "fry", "fried", "fries", "deep-fried", "shallow-fried", "stir-fry",
  "sauté", "sauteed", "sautéed", "pan-fried", "tawa",
  // Indian sauce/gravy signals
  "curry", "masala", "gravy", "makhani", "korma", "tikka", "kadai",
  "bhuna", "jalfrezi", "keema", "do pyaza", "roganjosh", "rogan josh",
  "shahi", "nawabi", "mughlai",
  // South/East Asian sauce signals
  "stir fry", "sweet and sour", "szechuan", "sichuan", "teriyaki",
  "sambal", "rendang", "laksa",
  // Fat-heavy preparations
  "butter", "ghee", "oil", "tempura", "battered", "pakora", "bhajiya",
  // Specific dishes commonly underestimated
  "biryani", "pulao", "pilaf", "poha", "upma", "halwa", "saag",
];

function matchesOilKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return OIL_TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns true when the meal is likely oil/fat-heavy enough to warrant
 * showing the oil estimation prompt. Checks the overall meal_summary and
 * each individual item name. Skips the prompt entirely for clearly
 * oil-free meals (raw salads, plain boiled items, fresh fruit, drinks)
 * even if the meal_summary superficially contains a keyword.
 */
export function mealNeedsOilEstimation(analysis: MealAnalysis): boolean {
  const allText = [
    analysis.meal_summary,
    ...analysis.items.map((i) => i.food_name),
  ].join(" ");
  return matchesOilKeyword(allText);
}

// ---- Oil option definitions ------------------------------------------

export type OilOptionId = "none" | "light" | "standard" | "heavy";

export interface OilOption {
  id: OilOptionId;
  label: string;
  subtitle: string;
  extraCalories: number;
  extraFat_g: number;
}

export const OIL_OPTIONS: OilOption[] = [
  {
    id: "none",
    label: "Light / Steamed",
    subtitle: "Grilled, boiled, or minimal oil spray",
    extraCalories: 0,
    extraFat_g: 0,
  },
  {
    id: "light",
    label: "Light Home Cook",
    subtitle: "+40 kcal  ·  ~½ tsp oil or a drizzle of ghee",
    extraCalories: 40,
    extraFat_g: 4.5,
  },
  {
    id: "standard",
    label: "Standard Home Cook",
    subtitle: "+100 kcal  ·  ~1 tbsp oil / ghee",
    extraCalories: 100,
    extraFat_g: 11,
  },
  {
    id: "heavy",
    label: "Restaurant / Heavy",
    subtitle: "+220 kcal  ·  ~2 tbsp oil / butter / ghee",
    extraCalories: 220,
    extraFat_g: 24,
  },
];

// ---- Macro merging ---------------------------------------------------

/**
 * Builds the synthetic "oil added" FoodItem that gets appended to the
 * meal's item list so calorie history stays traceable (rather than
 * silently inflating a random item's macros). Returns null for the "none"
 * option so callers can skip appending entirely.
 */
export function buildOilItem(option: OilOption): FoodItem | null {
  if (option.id === "none") return null;
  const w = Math.round(option.extraFat_g);
  return {
    food_name: `Oil / fat adjustment (${option.label})`,
    estimated_weight_g: w,
    estimated_weight_min_g: w,
    estimated_weight_max_g: w,
    best_guess_weight_g: w,
    weight_confidence_level: "high",
    confidence_explanation: "User-selected cooking method",
    macros: {
      calories: option.extraCalories,
      protein_g: 0,
      carbs_g: 0,
      fat_g: option.extraFat_g,
    },
    confidence_score: 100,
  };
}

/**
 * Merges the selected oil option's macros into a copy of the analysis.
 * The oil is appended as its own FoodItem so it's visible and removable
 * by the user if they change their mind (e.g. by tapping Edit → Delete on
 * the oil item in the list), rather than being hidden inside another
 * item's numbers.
 */
export function applyOilToAnalysis(
  analysis: MealAnalysis,
  option: OilOption
): MealAnalysis {
  if (option.id === "none") return analysis;
  const oilItem = buildOilItem(option)!;
  return {
    ...analysis,
    items: [...analysis.items, oilItem],
    total_calories: analysis.total_calories + option.extraCalories,
  };
}

/** Computes the preview macro delta shown inside the bottom sheet. */
export function oilMacroDelta(option: OilOption): Macros {
  return {
    calories: option.extraCalories,
    protein_g: 0,
    carbs_g: 0,
    fat_g: option.extraFat_g,
  };
}