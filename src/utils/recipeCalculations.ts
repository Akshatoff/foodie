import { Macros } from "@/types";
import { Recipe, RecipeIngredientRef, RecipeComputedTotals } from "@/types/recipes";
import { getIFCTFoodById, macrosForRawWeight, rawWeightToCookedWeight } from "@/utils/ifctConversion";
import { getFoodById, searchFoods } from "@/utils/foodSearch";
import ifctStaplesData from "@/data/ifctStaples.json";
import type { IFCTMacrosPer100g, IFCTFoodEntry } from "@/types/ifctFoods";
import type { FoodMacrosPer100g } from "@/types/foods";

const IFCT_STAPLES = ifctStaplesData as IFCTFoodEntry[];

function toMacros(m: IFCTMacrosPer100g | FoodMacrosPer100g): Macros {
  return { calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g };
}

function zeroMacros(): Macros {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein_g: Math.round((a.protein_g + b.protein_g) * 10) / 10,
    carbs_g: Math.round((a.carbs_g + b.carbs_g) * 10) / 10,
    fat_g: Math.round((a.fat_g + b.fat_g) * 10) / 10,
  };
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    calories: Math.round(m.calories * factor),
    protein_g: Math.round(m.protein_g * factor * 10) / 10,
    carbs_g: Math.round(m.carbs_g * factor * 10) / 10,
    fat_g: Math.round(m.fat_g * factor * 10) / 10,
  };
}

export interface ResolvedIngredient {
  ref: RecipeIngredientRef;
  macros: Macros;
  /** Cooked-equivalent weight this ingredient contributes to the batch. */
  cookedWeightG: number;
  /** False if the underlying dataset entry couldn't be found (e.g. was
   * removed) - the ingredient is skipped from totals rather than crashing,
   * but flagged so the UI can warn the user their total is now incomplete. */
  resolved: boolean;
}

/**
 * Resolves one ingredient line against its source dataset. IFCT
 * ingredients use their raw weight + yield factor to get both macros and
 * cooked-equivalent weight; food-database ingredients have no raw/cooked
 * distinction in this schema; weightG is used directly as-is.
 */
export function resolveIngredient(ref: RecipeIngredientRef): ResolvedIngredient {
  if (ref.source === "ifct") {
    const entry = getIFCTFoodById(ref.refId);
    if (!entry) return { ref, macros: zeroMacros(), cookedWeightG: 0, resolved: false };
    return {
      ref,
      macros: toMacros(macrosForRawWeight(entry, ref.weightG)),
      cookedWeightG: rawWeightToCookedWeight(entry, ref.weightG),
      resolved: true,
    };
  }

  const entry = getFoodById(ref.refId);
  if (!entry) return { ref, macros: zeroMacros(), cookedWeightG: 0, resolved: false };
  return {
    ref,
    macros: scaleMacros(toMacros(entry.macros_per_100g), ref.weightG / 100),
    cookedWeightG: ref.weightG,
    resolved: true,
  };
}

/**
 * The core payoff of the whole feature: totals computed from YOUR actual
 * ingredient weights for THIS batch, not a generic per-100g estimate of
 * "dal" in the abstract. Once this is computed, logging a portion of it
 * is an exact lookup (macrosPer100gCooked scaled to whatever weight you
 * ate), not a fresh guess.
 */
export function computeRecipeTotals(recipe: Recipe): RecipeComputedTotals {
  let totalMacros = zeroMacros();
  let totalCookedWeightG = 0;

  for (const ref of recipe.ingredients) {
    const resolved = resolveIngredient(ref);
    totalMacros = addMacros(totalMacros, resolved.macros);
    totalCookedWeightG += resolved.cookedWeightG;
  }

  const macrosPer100gCooked =
    totalCookedWeightG > 0 ? scaleMacros(totalMacros, 100 / totalCookedWeightG) : zeroMacros();

  const servings = Math.max(1, recipe.servings);
  const macrosPerServing = scaleMacros(totalMacros, 1 / servings);
  const weightPerServingG = Math.round(totalCookedWeightG / servings);

  return {
    totalCookedWeightG: Math.round(totalCookedWeightG),
    totalMacros,
    macrosPer100gCooked,
    macrosPerServing,
    weightPerServingG,
  };
}

/** Macros for an arbitrary weight of this recipe's cooked batch - the
 * function that makes "I ate 220g of my dal" or "1 medium katori of my
 * dal" an exact calculation once the recipe has been built once. */
export function macrosForRecipePortion(recipe: Recipe, portionWeightG: number): Macros {
  const totals = computeRecipeTotals(recipe);
  if (totals.totalCookedWeightG === 0) return zeroMacros();
  return scaleMacros(totals.macrosPer100gCooked, portionWeightG / 100);
}

// ---- Ingredient search (combined across both datasets) ------------------

export interface IngredientSearchResult {
  source: "ifct" | "food";
  refId: string;
  name: string;
  /** True for IFCT entries - lets the UI show "raw weight" vs "weight
   * used" labeling appropriately when adding this ingredient. */
  isRawBasis: boolean;
}

/**
 * Searches IFCT staples first (they're the higher-precision option for
 * anything they cover - dals, grains, oils, flours), then falls back to
 * the general food database for everything else (proteins, curries,
 * vegetables not in the staples list). Deduplicates by refId in case
 * something is ever added to both.
 */
export function searchIngredients(query: string, limit = 15): IngredientSearchResult[] {
  const q = query.trim().toLowerCase();
  const results: IngredientSearchResult[] = [];

  // IFCT staples: simple substring/alias match (small dataset, no need
  // for the fuzzy scoring searchFoods() does for the much larger general
  // database).
  if (q.length > 0) {
    for (const entry of IFCT_STAPLES) {
      const nameMatch = entry.name.toLowerCase().includes(q);
      const aliasMatch = entry.aliases.some((a) => a.toLowerCase().includes(q));
      if (nameMatch || aliasMatch) {
        results.push({ source: "ifct", refId: entry.id, name: entry.name, isRawBasis: true });
      }
    }
  }

  // General food database: reuse the existing fuzzy search.
  const foodMatches = searchFoods(query, { limit });
  for (const food of foodMatches) {
    if (!results.some((r) => r.refId === food.id)) {
      results.push({ source: "food", refId: food.id, name: food.name, isRawBasis: false });
    }
  }

  return results.slice(0, limit);
}
