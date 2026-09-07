import { Macros, FoodItem, MealAnalysis } from "@/types";
import { CorrectionPresetKey, CorrectionFactors } from "@/store/correctionStore";

/**
 * Why protein is preserved while calories and fat are scaled:
 *
 * The systematic underestimation this feature fixes is almost entirely due
 * to unaccounted cooking oils, ghee, and butter - all of which are pure or
 * near-pure fat. Protein content is largely determined by the protein source
 * (chicken, lentils, paneer) whose quantity the user can see and estimate
 * reasonably well from the portion size. Scaling protein would produce
 * incorrect data - a restaurant chicken curry doesn't have more protein than
 * the same dish cooked at home, it just has more fat from the cooking medium.
 * Carbs are similarly structural to the dish (rice, bread, vegetables) and
 * are therefore also preserved.
 *
 * Calorie adjustment = fat adjustment (since extra fat = 9 kcal/g) is the
 * nutritionally accurate model for this correction.
 */
export function applyCorrection(macros: Macros, multiplier: number): Macros {
  if (multiplier === 1.0) return macros;

  // Extra fat in grams from the multiplier.
  const extraFat_g = macros.fat_g * (multiplier - 1);
  // Extra calories come entirely from that extra fat.
  const extraCalories = Math.round(extraFat_g * 9);

  return {
    calories: Math.round(macros.calories + extraCalories),
    protein_g: macros.protein_g,       // preserved - see note above
    carbs_g: macros.carbs_g,           // preserved - structural to the dish
    fat_g: Math.round((macros.fat_g * multiplier) * 10) / 10,
  };
}

/** Applies the multiplier to a single FoodItem, returning a corrected copy. */
export function applyCorrectItemMacros(item: FoodItem, multiplier: number): FoodItem {
  if (multiplier === 1.0) return item;
  return { ...item, macros: applyCorrection(item.macros, multiplier) };
}

/**
 * Applies a correction multiplier to a full MealAnalysis. Each item's macros
 * are corrected individually, and total_calories is recalculated from the
 * corrected items (rather than simply multiplying the total) so the per-item
 * breakdown stays consistent with the meal total.
 */
export function applyCorrectAnalysis(
  analysis: MealAnalysis,
  multiplier: number
): MealAnalysis {
  if (multiplier === 1.0) return analysis;
  const correctedItems = analysis.items.map((item) =>
    applyCorrectItemMacros(item, multiplier)
  );
  const correctedTotal = correctedItems.reduce(
    (sum, item) => sum + item.macros.calories,
    0
  );
  return {
    ...analysis,
    items: correctedItems,
    total_calories: correctedTotal,
  };
}

/**
 * Picks the right multiplier for a given preset key, respecting the
 * user's enabled flag. Returns 1.0 (no-op) when corrections are disabled.
 */
export function resolveMultiplier(
  factors: CorrectionFactors,
  enabled: boolean,
  activePreset: CorrectionPresetKey | null
): number {
  if (!enabled || activePreset === null) return 1.0;
  return factors[activePreset] ?? 1.0;
}

/** Human-readable description of what the multiplier adds. Used in UI copy. */
export function multiplierLabel(multiplier: number): string {
  if (multiplier <= 1.0) return "No adjustment";
  const pct = Math.round((multiplier - 1) * 100);
  const extraFatPerG = multiplier - 1; // proportional extra fat per gram fat
  return `+${pct}% calories & fat`;
}
