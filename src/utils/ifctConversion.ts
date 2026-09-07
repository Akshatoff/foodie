import { IFCTFoodEntry, IFCTMacrosPer100g } from "@/types/ifctFoods";
import ifctStaplesData from "@/data/ifctStaples.json";

const IFCT_STAPLES = ifctStaplesData as IFCTFoodEntry[];

// ---- Lookup ----------------------------------------------------------

const byId = new Map<string, IFCTFoodEntry>(IFCT_STAPLES.map((f) => [f.id, f]));

export function getIFCTFoodById(id: string): IFCTFoodEntry | undefined {
  return byId.get(id);
}

export function getAllIFCTStaples(): IFCTFoodEntry[] {
  return IFCT_STAPLES;
}

// ---- Scaling helper ----------------------------------------------------

function scaleMacros(macros: IFCTMacrosPer100g, factor: number): IFCTMacrosPer100g {
  return {
    calories: Math.round(macros.calories * factor),
    protein_g: Math.round(macros.protein_g * factor * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * factor * 10) / 10,
    fat_g: Math.round(macros.fat_g * factor * 10) / 10,
    fiber_g: Math.round(macros.fiber_g * factor * 10) / 10,
  };
}

// ---- Core conversions --------------------------------------------------

/**
 * Converts a cooked dish weight (what the user actually measured/logged,
 * e.g. "200g of cooked toor dal") back to the equivalent raw ingredient
 * weight, using the entry's cooked_yield_factor.
 *
 * Nutrients don't change during boiling (aside from minor leaching we
 * don't attempt to model) - they're just diluted across more mass as
 * water is absorbed. So the raw-equivalent weight is what you look up
 * against macros_per_100g_raw to get the true nutrient content of what
 * was actually eaten.
 *
 * Returns the input unchanged when cooked_yield_factor is null (item has
 * no cooking transformation - e.g. oil, paneer).
 */
export function cookedWeightToRawEquivalent(
  entry: IFCTFoodEntry,
  cookedWeightG: number
): number {
  if (!entry.cooked_yield_factor || entry.cooked_yield_factor <= 0) {
    return cookedWeightG;
  }
  return cookedWeightG / entry.cooked_yield_factor;
}

/** Inverse of the above: raw weight -> the cooked weight it yields. */
export function rawWeightToCookedWeight(
  entry: IFCTFoodEntry,
  rawWeightG: number
): number {
  if (!entry.cooked_yield_factor || entry.cooked_yield_factor <= 0) {
    return rawWeightG;
  }
  return rawWeightG * entry.cooked_yield_factor;
}

/**
 * The main function for logging a cooked dish: given how much cooked
 * product the user says they ate, returns the actual macros - correctly
 * adjusted for water dilution rather than naively applying the raw
 * per-100g figures to the (larger) cooked weight, which would overstate
 * calories by roughly the cooked_yield_factor.
 */
export function macrosForCookedWeight(
  entry: IFCTFoodEntry,
  cookedWeightG: number
): IFCTMacrosPer100g {
  const rawEquivalentG = cookedWeightToRawEquivalent(entry, cookedWeightG);
  return scaleMacros(entry.macros_per_100g_raw, rawEquivalentG / 100);
}

/** Macros for a given weight of the RAW ingredient (no conversion needed -
 * provided for symmetry/convenience alongside macrosForCookedWeight). */
export function macrosForRawWeight(
  entry: IFCTFoodEntry,
  rawWeightG: number
): IFCTMacrosPer100g {
  return scaleMacros(entry.macros_per_100g_raw, rawWeightG / 100);
}

/**
 * Derives the per-100g macro profile of the COOKED form, e.g. "cooked
 * toor dal" rather than "raw toor dal" - useful for displaying a
 * cooked-basis figure without needing a second stored macro table (which
 * would risk drifting out of sync with the raw values over time).
 */
export function macrosPer100gCooked(entry: IFCTFoodEntry): IFCTMacrosPer100g {
  if (!entry.cooked_yield_factor || entry.cooked_yield_factor <= 0) {
    return entry.macros_per_100g_raw;
  }
  return scaleMacros(entry.macros_per_100g_raw, 1 / entry.cooked_yield_factor);
}

/**
 * How much water (in grams) a given raw weight will absorb during
 * standard cooking, per the entry's hydration_ratio. Purely informational
 * (e.g. for a "how much water to add" cooking tip) - not used in the
 * macro math, since macros are calculated from mass conservation via
 * cooked_yield_factor instead.
 */
export function estimatedWaterAddedG(
  entry: IFCTFoodEntry,
  rawWeightG: number
): number {
  if (!entry.hydration_ratio) return 0;
  return Math.round(rawWeightG * entry.hydration_ratio);
}
