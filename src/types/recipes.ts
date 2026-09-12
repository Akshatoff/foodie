import { Macros } from "@/types";

/** Which dataset an ingredient line references. IFCT staples carry
 * raw-to-cooked yield modeling (see ifctConversion.ts); general food
 * database entries (foods.json) are already on an "as prepared/eaten"
 * basis with no further yield transform applied. */
export type RecipeIngredientSource = "ifct" | "food";

export interface RecipeIngredientRef {
  /** Unique within this recipe only - lets the UI key/edit/remove a
   * specific line even if the same underlying ingredient is used twice
   * (e.g. oil added at two different cooking stages). */
  lineId: string;
  source: RecipeIngredientSource;
  /** id within that dataset, e.g. "toor_dal_raw" (ifct) or
   * "chicken_breast_cooked" (food). */
  refId: string;
  /** Cached display name at add-time, so the recipe stays readable even
   * if the underlying dataset entry is ever renamed. */
  name: string;
  /** Weight in grams as measured/added to the pot - RAW weight for IFCT
   * ingredients (uncooked, as bought), or "weight used" directly for
   * food-database ingredients (which have no raw/cooked distinction in
   * this schema). */
  weightG: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredientRef[];
  /** Nominal number of servings this batch is meant to divide into - used
   * only as a convenience default portion size ("1 serving" quick button).
   * The source of truth for macros is always total batch weight + total
   * batch macros; servings never changes what a given gram weight equals. */
  servings: number;
  createdAt: string;
  updatedAt: string;
}

/** Computed (never stored - always derived fresh from current ingredient
 * data, so editing an ingredient's weight or the underlying dataset never
 * leaves a stale cached total behind). */
export interface RecipeComputedTotals {
  /** Total weight of the finished, cooked batch in grams. */
  totalCookedWeightG: number;
  /** Total macros for the entire batch. */
  totalMacros: Macros;
  /** Derived: totalMacros expressed per 100g of the cooked batch - this is
   * what makes "log 220g of my dal" or "log 1 katori of my dal" an exact
   * lookup instead of a generic-ingredient guess. */
  macrosPer100gCooked: Macros;
  /** totalMacros / servings - the "1 serving" quick-log amount. */
  macrosPerServing: Macros;
  weightPerServingG: number;
}
