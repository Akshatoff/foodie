import { Macros } from "@/types";

// ---- Macro helpers -------------------------------------------------------

function zeroMacros(): Macros {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    calories: Math.round(m.calories * factor),
    protein_g: Math.round(m.protein_g * factor * 10) / 10,
    carbs_g: Math.round(m.carbs_g * factor * 10) / 10,
    fat_g: Math.round(m.fat_g * factor * 10) / 10,
  };
}

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein_g: Math.round((a.protein_g + b.protein_g) * 10) / 10,
    carbs_g: Math.round((a.carbs_g + b.carbs_g) * 10) / 10,
    fat_g: Math.round((a.fat_g + b.fat_g) * 10) / 10,
  };
}

// ---- Density mapping (volume -> weight) ---------------------------------

/**
 * g/ml density for common Indian dish consistencies. Water is 1.0 g/ml by
 * definition - these are approximate, food-specific densities used to
 * convert a katori's known VOLUME into the WEIGHT needed for macro lookup,
 * since nutrition data is per-100g, not per-100ml.
 *
 * Thin/watery preparations are slightly under 1.0 (more water, some air/
 * froth); thick gravies and dals with less water and more solids/fat are
 * slightly over 1.0; cooked rice is notably under 1.0 because grains trap
 * air pockets between them. These are reference approximations, not lab
 * measurements - see the same accuracy caveat as the rest of this app's
 * offline nutrition data.
 */
export const DENSITY_MAP = {
  watery_dal: 0.9, // thin dal, rasam-like consistency
  thick_dal: 1.05, // dal makhani style, less water
  thin_gravy: 0.95, // light curries, kadhi
  thick_gravy: 1.1, // rich gravies - butter masala, korma
  cooked_rice: 0.8, // steamed/cooked rice, grains with air pockets
  curd_yogurt: 1.03,
  milk: 1.03,
  generic_liquid: 1.0,
  generic_solid: 1.0, // fallback for solids measured by "katori" as a rough volume proxy
} as const;

export type DensityCategory = keyof typeof DENSITY_MAP;

export const DENSITY_LABELS: Record<DensityCategory, string> = {
  watery_dal: "Thin Dal / Rasam",
  thick_dal: "Thick Dal",
  thin_gravy: "Light Curry / Kadhi",
  thick_gravy: "Rich Gravy",
  cooked_rice: "Cooked Rice",
  curd_yogurt: "Curd / Yogurt",
  milk: "Milk",
  generic_liquid: "Other Liquid",
  generic_solid: "Other Solid",
};

/** Converts a volume (ml) to weight (g) for a given dish density category. */
export function volumeToWeight(volumeMl: number, density: DensityCategory): number {
  return Math.round(volumeMl * DENSITY_MAP[density]);
}

// ---- Preset unit definitions ---------------------------------------------

export interface KatoriSize {
  id: string;
  label: string;
  volumeMl: number;
  emoji: string;
}

export const KATORI_SIZES: KatoriSize[] = [
  { id: "small", label: "Small Katori", volumeMl: 120, emoji: "🥣" },
  { id: "medium", label: "Medium Katori", volumeMl: 200, emoji: "🥣" },
  { id: "large", label: "Large Katori / Bowl", volumeMl: 350, emoji: "🍲" },
];

export interface FlatbreadSize {
  id: string;
  label: string;
  flourWeightG: number;
  /** Fat (ghee/oil) added as a fraction of flour weight - 0 for phulka/
   * roti made without added fat; paratha is layered/brushed with ghee
   * during cooking, typically ~15-20% of the flour weight. */
  fatMultiplier: number;
  emoji: string;
}

export const FLATBREAD_SIZES: FlatbreadSize[] = [
  { id: "phulka", label: "Thin Phulka", flourWeightG: 20, fatMultiplier: 0, emoji: "🫓" },
  { id: "roti", label: "Medium Roti", flourWeightG: 30, fatMultiplier: 0, emoji: "🫓" },
  { id: "paratha", label: "Large Paratha", flourWeightG: 45, fatMultiplier: 0.18, emoji: "🫓" },
];

export interface FatUnit {
  id: string;
  label: string;
  weightG: number;
  emoji: string;
}

export const FAT_UNITS: FatUnit[] = [
  { id: "tsp", label: "Teaspoon", weightG: 5, emoji: "🥄" },
  { id: "tbsp", label: "Tablespoon", weightG: 15, emoji: "🥄" },
];

export type PortionUnitMode = "katori" | "flatbread" | "fat";

export interface PortionResult {
  weightG: number;
  macros: Macros;
  /** Human-readable summary, e.g. "Medium Katori (200ml, thick gravy)". */
  description: string;
}

// ---- Calculation functions ------------------------------------------------

/**
 * Katori mode: converts the katori's volume to weight via the dish's
 * density category, then scales the food's per-100g macros to that weight.
 * `foodMacrosPer100g` should be on a COOKED/as-eaten basis (e.g. from
 * macrosPer100gCooked() in ifctConversion.ts, or a foods.json entry that's
 * already cooked-basis).
 */
export function macrosForKatori(
  foodMacrosPer100g: Macros,
  katori: KatoriSize,
  density: DensityCategory
): PortionResult {
  const weightG = volumeToWeight(katori.volumeMl, density);
  return {
    weightG,
    macros: scaleMacros(foodMacrosPer100g, weightG / 100),
    description: `${katori.label} (${katori.volumeMl}ml, ${DENSITY_LABELS[density].toLowerCase()})`,
  };
}

/**
 * Flatbread mode: computes macros from RAW flour weight directly (nutrient
 * content doesn't change when water is kneaded in and cooked off on a
 * tawa - it's just redistributed across a puffier, lighter piece of
 * bread), plus any added fat (ghee/oil) for richer preparations like
 * paratha. `flourMacrosPer100g` should be the raw flour's per-100g macros
 * (e.g. IFCT atta_whole_wheat); `fatMacrosPer100g` the raw fat's per-100g
 * macros (e.g. IFCT ghee).
 */
export function macrosForFlatbread(
  flourMacrosPer100g: Macros,
  fatMacrosPer100g: Macros,
  size: FlatbreadSize
): PortionResult {
  const flourMacros = scaleMacros(flourMacrosPer100g, size.flourWeightG / 100);
  const fatAddedG = Math.round(size.flourWeightG * size.fatMultiplier);
  const fatMacros = fatAddedG > 0 ? scaleMacros(fatMacrosPer100g, fatAddedG / 100) : zeroMacros();
  const combined = addMacros(flourMacros, fatMacros);

  // Served weight approximates flour weight after water absorption/
  // puffing (roti typically ends up ~1.3-1.4x its dry flour weight) plus
  // whatever fat was added on top.
  const servedWeightG = Math.round(size.flourWeightG * 1.35 + fatAddedG);

  return {
    weightG: servedWeightG,
    macros: combined,
    description:
      fatAddedG > 0
        ? `${size.label} (${size.flourWeightG}g flour + ${fatAddedG}g ghee/oil)`
        : `${size.label} (${size.flourWeightG}g flour)`,
  };
}

/** Fat mode: a fixed spoon weight applied directly against the chosen
 * fat's per-100g macros (e.g. IFCT ghee, mustard_oil). */
export function macrosForFatUnit(fatMacrosPer100g: Macros, unit: FatUnit): PortionResult {
  return {
    weightG: unit.weightG,
    macros: scaleMacros(fatMacrosPer100g, unit.weightG / 100),
    description: `1 ${unit.label} (${unit.weightG}g)`,
  };
}
