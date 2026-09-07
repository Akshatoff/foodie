/**
 * Schema for src/data/ifctStaples.json - Indian staple foods (dals,
 * grains, flatbread flours, oils, dairy) with raw-to-cooked conversion
 * metadata modeled on the IFCT (Indian Food Composition Tables) /
 * ICMR-NIN convention of reporting nutrients per 100g of the RAW/dry
 * ingredient.
 *
 * IMPORTANT PROVENANCE NOTE:
 * The macro values in ifctStaples.json are reference-quality estimates
 * built from widely-cited Indian nutrition figures, not a verified
 * transcription of the official IFCT 2017 publication or ICMR-NIN's
 * database. Treat them the same way the rest of this app's offline food
 * data is treated (see foods.json / ACCURACY_ANALYSIS.md) - good enough
 * for everyday tracking, not audit-grade. If exact compliance with the
 * published IFCT tables is required (e.g. for a clinical or research
 * context), the values here should be cross-checked against the physical
 * IFCT 2017 book or ICMR-NIN's official tables before relying on them.
 *
 * Similarly, cooked_yield_factor and hydration_ratio are typical culinary
 * conversion ratios (how much a raw ingredient's weight and water content
 * change during standard home cooking), not values published per-item in
 * IFCT itself - IFCT's primary contribution here is the raw composition
 * data; yield/hydration modeling is this app's own addition to make that
 * data usable against "how much cooked dal did you eat" style logging.
 */

export const IFCT_CATEGORIES = [
  "Dal",
  "Grain",
  "Flatbread Flour",
  "Legume",
  "Dairy",
  "Fat/Oil",
] as const;

export type IFCTCategory = (typeof IFCT_CATEGORIES)[number];

export const IFCT_PREPARATION_TYPES = [
  "raw",           // eaten/used as-is, no water-cooking transform (oils, paneer)
  "boiled",        // dal, rice cooked in water
  "pressure-cooked", // dal, rajma, chana cooked under pressure
  "roasted",       // flour roasted dry before use (e.g. some rava prep)
  "griddle-cooked", // roti/flatbread cooked on a tawa after kneading with water
] as const;

export type IFCTPreparationType = (typeof IFCT_PREPARATION_TYPES)[number];

export interface IFCTMacrosPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface IFCTFoodEntry {
  id: string;
  name: string;
  aliases: string[];
  category: IFCTCategory;
  preparation_type: IFCTPreparationType;

  /**
   * The raw/dry weight basis (in grams) that macros_per_100g_raw and the
   * yield/hydration ratios below are defined relative to. Always 100 for
   * this dataset (IFCT's standard per-100g convention) - kept as an
   * explicit field rather than a hardcoded assumption so the schema
   * doesn't silently break if a future entry uses a different basis
   * (e.g. "per piece" for something not naturally measured in 100g units).
   */
  raw_weight_g: number;

  /**
   * Multiplier from raw weight to cooked weight, e.g. 2.5 means 100g raw
   * becomes 250g once cooked (water absorbed, minus what evaporates).
   * null for items with no cooking transformation - oils, paneer, and raw
   * flours that are never logged in a "cooked yield" sense on their own
   * (besan, used only as a batter ingredient in other dishes).
   */
  cooked_yield_factor: number | null;

  /**
   * Typical water-to-dry-ingredient ratio (by weight) used in standard
   * home cooking, e.g. 2.5 means ~250g water is added per 100g raw dal
   * before pressure-cooking. This is usually somewhat HIGHER than
   * cooked_yield_factor - 1, since some water evaporates during cooking
   * (rice, roti) or is drained off. null where not applicable.
   */
  hydration_ratio: number | null;

  /** IFCT-style nutrient values per 100g of the RAW/dry ingredient. */
  macros_per_100g_raw: IFCTMacrosPer100g;

  /** Clarifies what the numbers represent and their provenance - shown in
   * any UI that surfaces this data, so users aren't misled about precision. */
  source_note: string;
}
