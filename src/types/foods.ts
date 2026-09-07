/**
 * Schema for src/data/foods.json - the expanded offline food database
 * (177 entries as of writing). Kept separate from the older, simpler
 * CommonFood type in src/types/index.ts (used by the original manual-entry
 * flow) since this schema carries more metadata (aliases, category,
 * preparation method) that CommonFood never needed.
 */

export const FOOD_CATEGORIES = [
  "Grains",
  "Breads",
  "Legumes",
  "Proteins",
  "Dairy",
  "Vegetables",
  "Fruits",
  "Nuts & Seeds",
  "Curries",
  "Snacks",
  "Sweets",
  "Fast Food",
  "Condiments & Fats",
  "Beverages",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface FoodMacrosPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface FoodDatabaseEntry {
  id: string;
  name: string;
  /** Alternative names/regional terms, e.g. ["chapati", "fulka", "phulka"]. */
  aliases: string[];
  category: FoodCategory;
  preparation_method: string;
  /** Human label for one serving, e.g. "piece", "bowl", "slice", "tbsp". */
  serving_unit: string;
  /** Typical weight in grams of one `serving_unit`, e.g. 40 for one roti. */
  default_unit_weight_g: number;
  macros_per_100g: FoodMacrosPer100g;
}
