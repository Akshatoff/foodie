import { Macros } from "@/types";
import { PortionUnitMode, DensityCategory } from "@/utils/householdUnits";
import { getIFCTFoodById, macrosPer100gCooked } from "@/utils/ifctConversion";
import { getFoodById } from "@/utils/foodSearch";
import type { IFCTMacrosPer100g } from "@/types/ifctFoods";
import type { FoodMacrosPer100g } from "@/types/foods";

/** Drops fiber_g (not part of the app's core Macros type) to adapt either
 * dataset's 5-field macro shape down to the 4-field shape used everywhere
 * else in the app. */
function toMacros(m: IFCTMacrosPer100g | FoodMacrosPer100g): Macros {
  return { calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g };
}

export interface QuickHouseholdItem {
  id: string;
  label: string;
  emoji: string;
  modes: PortionUnitMode[];
  foodMacrosPer100g?: Macros;
  densityCategory?: DensityCategory;
  flourMacrosPer100g?: Macros;
  fatMacrosPer100g?: Macros;
}

/**
 * Pre-wired quick-add entries for the household unit selector, sourced
 * from the IFCT staples dataset (ifctStaples.json) and the general food
 * database (foods.json) built in earlier work - rather than hardcoding
 * macro numbers a third time in this file.
 */
export function buildQuickHouseholdItems(): QuickHouseholdItem[] {
  const toorDal = getIFCTFoodById("toor_dal_raw");
  const basmatiRice = getIFCTFoodById("basmati_rice_raw");
  const atta = getIFCTFoodById("atta_whole_wheat");
  const ghee = getIFCTFoodById("ghee");
  const mustardOil = getIFCTFoodById("mustard_oil");
  const curd = getFoodById("curd_plain");

  const items: QuickHouseholdItem[] = [];

  if (toorDal) {
    items.push({
      id: "quick_dal",
      label: "Dal",
      emoji: "🍛",
      modes: ["katori"],
      foodMacrosPer100g: toMacros(macrosPer100gCooked(toorDal)),
      densityCategory: "thick_dal",
    });
  }

  if (basmatiRice) {
    items.push({
      id: "quick_rice",
      label: "Rice",
      emoji: "🍚",
      modes: ["katori"],
      foodMacrosPer100g: toMacros(macrosPer100gCooked(basmatiRice)),
      densityCategory: "cooked_rice",
    });
  }

  if (curd) {
    items.push({
      id: "quick_curd",
      label: "Curd / Yogurt",
      emoji: "🥛",
      modes: ["katori"],
      foodMacrosPer100g: toMacros(curd.macros_per_100g),
      densityCategory: "curd_yogurt",
    });
  }

  if (atta && ghee) {
    items.push({
      id: "quick_roti",
      label: "Roti / Paratha",
      emoji: "🫓",
      modes: ["flatbread"],
      flourMacrosPer100g: toMacros(atta.macros_per_100g_raw),
      fatMacrosPer100g: toMacros(ghee.macros_per_100g_raw),
    });
  }

  if (ghee) {
    items.push({
      id: "quick_ghee",
      label: "Ghee",
      emoji: "🥄",
      modes: ["fat"],
      fatMacrosPer100g: toMacros(ghee.macros_per_100g_raw),
    });
  }

  if (mustardOil) {
    items.push({
      id: "quick_oil",
      label: "Cooking Oil",
      emoji: "🥄",
      modes: ["fat"],
      fatMacrosPer100g: toMacros(mustardOil.macros_per_100g_raw),
    });
  }

  return items;
}
