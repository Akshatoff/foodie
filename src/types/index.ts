// ---- Nutrition domain types ----------------------------------------------

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodItem {
  food_name: string;
  /** Best-guess single weight used for all macro calculations. */
  estimated_weight_g: number;
  /** Lower bound of the model's weight uncertainty range. */
  estimated_weight_min_g: number;
  /** Upper bound of the model's weight uncertainty range. */
  estimated_weight_max_g: number;
  /** Model's own summary confidence level for this weight estimate. */
  weight_confidence_level: "low" | "medium" | "high";
  /** Short human-readable reason for the confidence level, e.g.
   * "Depth unclear due to bowl shape" or "Standard slice size". */
  confidence_explanation: string;
  macros: Macros;
  confidence_score: number; // 0-100
  /** How many of this item the weight/macros above represent (e.g. 2 rotis).
   * Omitted or 1 means "just one" - only set when the user has bumped it up
   * via the quantity stepper instead of retaking a photo. */
  quantity?: number;
}

/** Raw shape returned by Gemini, validated against MEAL_ANALYSIS_SCHEMA. */
export interface MealAnalysis {
  meal_summary: string;
  total_calories: number;
  items: FoodItem[];
  /** How this analysis was produced. Manual entries skip the AI call
   * entirely (used as a fallback when Gemini is overloaded/unavailable). */
  source?: "ai" | "manual";
}

/** A meal as stored in the app, once the user confirms/saves it. */
export interface LoggedMeal extends MealAnalysis {
  id: string;
  imageUri: string;
  loggedAt: string; // ISO timestamp
  /** e.g. ["Breakfast"] or ["Snacks", "Energy Recovery"]. Always at least
   * one tag - UI defaults to "Snacks" if the user picks none. */
  tags: string[];
}

// ---- Local food database (for manual entry) --------------------------------

/** Per-100g macro reference for the offline food picker. */
export interface CommonFood {
  id: string;
  name: string;
  per100g: Macros;
  /** If set, this food is countable (e.g. "1 roti" ~ 40g) and the manual
   * entry screen shows a quantity stepper instead of a grams input. */
  unit?: { label: string; gramsPerUnit: number };
}

// ---- Tags -------------------------------------------------------------------

export const DEFAULT_TAGS: string[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Energy Recovery",
];

// ---- Goals --------------------------------------------------------------

export interface GoalSet {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type ProgressPeriod = "daily" | "weekly" | "monthly";

// ---- Exercise suggestions -------------------------------------------------

export interface ExerciseOption {
  id: string;
  name: string;
  /** MET (metabolic equivalent) value used for the calorie-burn estimate. */
  met: number;
}

// ---- Navigation -----------------------------------------------------------

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Results: {
    imageUri: string;
    analysis: MealAnalysis;
    /** Present when reopening an already-saved meal to edit (e.g. bump
     * quantity) rather than saving a brand new one. */
    mealId?: string;
  };
  /** imageUri is optional - reachable either from a failed AI analysis
   * (photo already captured) or directly from Home (no photo at all). */
  ManualEntry: {
    imageUri?: string;
  };
  Goals: undefined;
  Progress: undefined;
  Calendar: undefined;
  CorrectionSettings: undefined;
  PendingQueue: undefined;
};

// ---- AI service result -----------------------------------------------------

export type AiErrorCode =
  | "MISSING_KEY"
  | "TIMEOUT"
  | "OVERLOADED"
  | "NETWORK_ERROR"
  | "EMPTY_RESPONSE"
  | "PARSE_ERROR"
  | "INVALID_FORMAT"
  | "UNKNOWN";

export type AiServiceResult =
  | { success: true; data: MealAnalysis; modelUsed: string }
  | { success: false; error: string; code: AiErrorCode };
