// Generates src/data/ifctStaples.json from the authored list below.
//
// PROVENANCE: macro values are reference-quality estimates built from
// widely-cited Indian nutrition figures (the kind commonly seen alongside
// IFCT/ICMR-NIN data), NOT a verified transcription of the official IFCT
// 2017 publication. Cross-check against the physical IFCT 2017 book or
// ICMR-NIN's published tables before relying on these for anything
// audit-grade (clinical, research, regulatory). See ifctFoods.ts for the
// full provenance note.
//
// cooked_yield_factor / hydration_ratio are typical culinary conversion
// ratios for standard home cooking (pressure-cooking dal, absorption-
// method rice, kneading roti dough) - not IFCT-published per-item
// figures. IFCT's contribution is the raw composition data; the
// yield/hydration modeling is this app's own addition.

const CATEGORIES = ["Dal", "Grain", "Flatbread Flour", "Legume", "Dairy", "Fat/Oil"];
const PREP_TYPES = ["raw", "boiled", "pressure-cooked", "roasted", "griddle-cooked"];

function f(
  id, name, aliases, category, preparation_type,
  cooked_yield_factor, hydration_ratio,
  cal, p, c, fat, fiber,
  source_note
) {
  return {
    id, name, aliases, category, preparation_type,
    raw_weight_g: 100,
    cooked_yield_factor,
    hydration_ratio,
    macros_per_100g_raw: { calories: cal, protein_g: p, carbs_g: c, fat_g: fat, fiber_g: fiber },
    source_note,
  };
}

const REFERENCE_NOTE =
  "Reference-quality estimate based on commonly-cited Indian nutrition figures; " +
  "not independently verified against the published IFCT 2017 tables.";

const staples = [
  // ---- Flatbread Flours ----
  f("atta_whole_wheat", "Atta (Whole Wheat Flour)", ["wheat flour", "gehun ka atta"],
    "Flatbread Flour", "griddle-cooked", 1.35, 0.65,
    341, 12.1, 69.4, 1.7, 11.2, REFERENCE_NOTE),

  f("maida_refined_flour", "Maida (Refined Wheat Flour)", ["all-purpose flour", "APF"],
    "Flatbread Flour", "griddle-cooked", 1.3, 0.6,
    348, 11.0, 73.9, 0.9, 2.7, REFERENCE_NOTE),

  f("bajra_flour", "Bajra Flour (Pearl Millet)", ["pearl millet flour"],
    "Flatbread Flour", "griddle-cooked", 1.35, 0.7,
    361, 11.6, 67.5, 5.0, 11.3, REFERENCE_NOTE),

  f("jowar_flour", "Jowar Flour (Sorghum)", ["sorghum flour"],
    "Flatbread Flour", "griddle-cooked", 1.35, 0.75,
    349, 10.4, 72.6, 1.9, 6.7, REFERENCE_NOTE),

  f("besan_gram_flour", "Besan (Gram Flour)", ["chickpea flour"],
    "Flatbread Flour", "raw", null, null,
    387, 22.0, 57.8, 6.7, 10.8,
    REFERENCE_NOTE + " No standalone cooked-yield factor - besan is used as a batter/binding ingredient in other dishes (pakora, dhokla, kadhi), not eaten as a fixed cooked-weight staple on its own."),

  // ---- Grains ----
  f("basmati_rice_raw", "Basmati Rice (raw)", ["basmati"],
    "Grain", "boiled", 2.7, 1.75,
    349, 7.9, 78.2, 0.5, 0.9, REFERENCE_NOTE),

  f("white_rice_raw", "White Rice, raw (non-basmati)", ["rice", "sona masuri"],
    "Grain", "boiled", 2.8, 1.75,
    345, 6.8, 78.2, 0.5, 0.2, REFERENCE_NOTE),

  f("suji_rava", "Suji / Rava (Semolina)", ["rava", "sooji"],
    "Grain", "boiled", 3.0, 2.25,
    348, 10.4, 74.8, 1.0, 2.8,
    REFERENCE_NOTE + " Yield factor assumes standard upma-style preparation; varies with desired consistency."),

  f("poha_flattened_rice", "Poha (Flattened Rice, dry)", ["chivda poha", "aval"],
    "Grain", "boiled", 1.8, 0.8,
    356, 6.6, 77.3, 1.2, 1.0,
    REFERENCE_NOTE + " Poha is rinsed/soaked briefly rather than boiled - yield factor reflects water taken up during rinsing plus light cooking."),

  // ---- Dals ----
  f("toor_dal_raw", "Toor Dal (raw, split pigeon pea)", ["arhar dal", "split pigeon pea"],
    "Dal", "pressure-cooked", 2.5, 2.5,
    335, 22.3, 57.6, 1.7, 15.0, REFERENCE_NOTE),

  f("chana_dal_raw", "Chana Dal (raw, split Bengal gram)", ["split chickpea dal"],
    "Dal", "pressure-cooked", 2.3, 2.5,
    372, 20.8, 61.5, 5.3, 12.6, REFERENCE_NOTE),

  f("moong_dal_raw", "Moong Dal (raw, split green gram)", ["mung dal", "yellow moong dal"],
    "Dal", "pressure-cooked", 2.7, 2.7,
    344, 24.5, 59.9, 1.2, 16.3, REFERENCE_NOTE),

  f("masoor_dal_raw", "Masoor Dal (raw, split red lentil)", ["red lentils", "masoor"],
    "Dal", "pressure-cooked", 2.7, 2.5,
    343, 25.0, 59.0, 1.1, 11.5, REFERENCE_NOTE),

  f("urad_dal_raw", "Urad Dal (raw, split black gram)", ["split black gram"],
    "Dal", "pressure-cooked", 2.5, 2.5,
    341, 25.0, 58.9, 1.4, 18.0, REFERENCE_NOTE),

  // ---- Legumes (whole, soaked + cooked) ----
  f("rajma_raw", "Rajma (raw, whole kidney beans)", ["kidney beans"],
    "Legume", "pressure-cooked", 2.8, 3.0,
    333, 22.9, 60.6, 1.3, 15.2,
    REFERENCE_NOTE + " Yield factor accounts for overnight soak plus pressure-cooking."),

  f("kabuli_chana_raw", "Kabuli Chana (raw, whole chickpeas)", ["chickpeas", "garbanzo beans", "white chana"],
    "Legume", "pressure-cooked", 2.5, 3.0,
    364, 20.5, 61.0, 5.6, 17.4,
    REFERENCE_NOTE + " Yield factor accounts for overnight soak plus pressure-cooking."),

  // ---- Dairy ----
  f("paneer_fresh", "Paneer", ["cottage cheese (indian)"],
    "Dairy", "raw", null, null,
    265, 18.3, 6.1, 20.8, 0,
    REFERENCE_NOTE + " Paneer is already a finished pressed-curd product - no further raw/cooked yield conversion applies within this schema."),

  // ---- Fats/Oils ----
  f("mustard_oil", "Mustard Oil", ["sarson ka tel"],
    "Fat/Oil", "raw", null, null,
    884, 0, 0, 100, 0,
    REFERENCE_NOTE + " Oils have no cooking-yield transformation - weight consumed equals weight measured."),

  f("ghee", "Ghee", ["clarified butter"],
    "Fat/Oil", "raw", null, null,
    900, 0, 0, 100, 0, REFERENCE_NOTE),

  f("groundnut_oil", "Groundnut Oil", ["peanut oil"],
    "Fat/Oil", "raw", null, null,
    884, 0, 0, 100, 0, REFERENCE_NOTE),
];

// ---- Validation --------------------------------------------------------

function validate(items) {
  const errors = [];
  const seenIds = new Set();

  items.forEach((item, idx) => {
    const where = `[${idx}] ${item.id ?? "(no id)"}`;

    if (!item.id || typeof item.id !== "string") errors.push(`${where}: missing/invalid id`);
    else if (seenIds.has(item.id)) errors.push(`${where}: duplicate id`);
    else seenIds.add(item.id);

    if (!item.name) errors.push(`${where}: missing name`);
    if (!Array.isArray(item.aliases)) errors.push(`${where}: aliases must be an array`);
    if (!CATEGORIES.includes(item.category)) errors.push(`${where}: unknown category "${item.category}"`);
    if (!PREP_TYPES.includes(item.preparation_type)) {
      errors.push(`${where}: unknown preparation_type "${item.preparation_type}"`);
    }
    if (item.raw_weight_g !== 100) errors.push(`${where}: raw_weight_g must be 100 for this dataset`);

    if (item.cooked_yield_factor !== null) {
      if (typeof item.cooked_yield_factor !== "number" || item.cooked_yield_factor <= 1) {
        errors.push(`${where}: cooked_yield_factor must be null or a number > 1 (cooking adds mass via water)`);
      }
      if (item.cooked_yield_factor > 4) {
        errors.push(`${where}: cooked_yield_factor implausibly high (${item.cooked_yield_factor})`);
      }
    }
    if (item.hydration_ratio !== null) {
      if (typeof item.hydration_ratio !== "number" || item.hydration_ratio <= 0) {
        errors.push(`${where}: hydration_ratio must be null or a positive number`);
      }
    }
    // A cooked_yield_factor without any hydration_ratio (or vice versa) is
    // suspicious - they should travel together since both describe the
    // same cooking transformation.
    if ((item.cooked_yield_factor === null) !== (item.hydration_ratio === null)) {
      errors.push(`${where}: cooked_yield_factor and hydration_ratio must both be null or both be set`);
    }

    const m = item.macros_per_100g_raw;
    if (!m) {
      errors.push(`${where}: missing macros_per_100g_raw`);
    } else {
      ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"].forEach((k) => {
        if (typeof m[k] !== "number" || m[k] < 0) errors.push(`${where}: macros_per_100g_raw.${k} invalid`);
      });
      if (m.calories > 950) errors.push(`${where}: calories/100g implausibly high (${m.calories})`);
      if (m.fat_g > 100) errors.push(`${where}: fat_g/100g exceeds 100 (${m.fat_g})`);
      if (m.carbs_g > 100) errors.push(`${where}: carbs_g/100g exceeds 100 (${m.carbs_g})`);
      if (m.protein_g > 100) errors.push(`${where}: protein_g/100g exceeds 100 (${m.protein_g})`);

      // Rough energy cross-check (4/4/9 kcal per g protein/carbs/fat).
      // Generous tolerance - this is a typo-catcher, not a strict audit.
      const estCal = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
      if (m.calories > 0 && Math.abs(estCal - m.calories) / m.calories > 0.35) {
        errors.push(
          `${where}: calories (${m.calories}) inconsistent with macros (~${Math.round(estCal)} estimated)`
        );
      }
    }

    if (!item.source_note || typeof item.source_note !== "string") {
      errors.push(`${where}: missing source_note - every entry must disclose data provenance`);
    }
  });

  if (items.length < 20) {
    errors.push(`Dataset has only ${items.length} entries - requirement was 20+`);
  }

  return errors;
}

const errors = validate(staples);
if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log(`Validated ${staples.length} IFCT staple entries. OK.`);

const fs = require("fs");
const path = require("path");
const outPath = path.join(__dirname, "..", "src", "data", "ifctStaples.json");
fs.writeFileSync(outPath, JSON.stringify(staples, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
