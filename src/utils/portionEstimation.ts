import { FoodItem, MealAnalysis, Macros } from "@/types";
import { scaledMacros } from "@/utils/nutrition";

export type PortionPresetId = "small" | "medium" | "large";

export interface PortionPreset {
  id: PortionPresetId;
  label: string;
  emoji: string;
  /** Multiplier applied to best_guess_weight_g. */
  multiplier: number;
}

export const PORTION_PRESETS: PortionPreset[] = [
  { id: "small", label: "Small Portion", emoji: "🥄", multiplier: 0.75 },
  { id: "medium", label: "Medium / Standard", emoji: "🍽️", multiplier: 1.0 },
  { id: "large", label: "Large / Full", emoji: "🍛", multiplier: 1.3 },
];

/**
 * Indices of items in `items` whose weight_confidence_level is "low" and
 * therefore need a quick clarification tap before saving. Manual entries
 * and oil-adjustment synthetic items are always "high" confidence (see
 * ManualEntryScreen and oilEstimation.ts), so this only ever fires for
 * genuinely uncertain vision estimates.
 */
export function getLowConfidenceIndices(items: FoodItem[]): number[] {
  return items.reduce<number[]>((acc, item, idx) => {
    if (item.weight_confidence_level === "low") acc.push(idx);
    return acc;
  }, []);
}

export function mealNeedsPortionConfirmation(analysis: MealAnalysis): boolean {
  return getLowConfidenceIndices(analysis.items).length > 0;
}

/**
 * Computes the weight a given preset would set an item to, and the macros
 * that result. Scales from best_guess_weight_g (not the current possibly
 * already-adjusted weight) so repeated preset taps don't compound.
 */
export function applyPortionPreset(
  item: FoodItem,
  preset: PortionPreset
): { weight: number; macros: Macros } {
  const base = item.best_guess_weight_g ?? item.estimated_weight_g;
  const weight = Math.round(base * preset.multiplier);
  return { weight, macros: scaledMacros(item, weight) };
}
