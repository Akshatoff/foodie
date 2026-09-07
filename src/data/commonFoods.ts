import { CommonFood } from "@/types";

/**
 * Small offline reference table (per 100g) so manual entry works with zero
 * network dependency - no AI, no external API. Values are reasonable
 * general estimates, not lab-grade figures.
 *
 * Items with a `unit` are countable (e.g. "1 roti") - the manual entry
 * screen shows a quantity stepper for these instead of a grams input, since
 * "I ate 2 rotis" is a much more natural way to log them than typing grams.
 */
export const COMMON_FOODS: CommonFood[] = [
  { id: "rice_white_cooked", name: "White rice (cooked)", per100g: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 } },
  { id: "rice_brown_cooked", name: "Brown rice (cooked)", per100g: { calories: 123, protein_g: 2.6, carbs_g: 26, fat_g: 1 } },
  { id: "chicken_breast_cooked", name: "Chicken breast (cooked)", per100g: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 } },
  { id: "chicken_thigh_cooked", name: "Chicken thigh (cooked)", per100g: { calories: 209, protein_g: 26, carbs_g: 0, fat_g: 11 } },
  { id: "egg_whole", name: "Egg, whole (cooked)", per100g: { calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 }, unit: { label: "egg", gramsPerUnit: 50 } },
  { id: "paneer", name: "Paneer", per100g: { calories: 265, protein_g: 18, carbs_g: 6, fat_g: 20 } },
  { id: "tofu", name: "Tofu", per100g: { calories: 76, protein_g: 8, carbs_g: 1.9, fat_g: 4.8 } },
  { id: "salmon_cooked", name: "Salmon (cooked)", per100g: { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13 } },
  { id: "beef_ground_cooked", name: "Ground beef (cooked)", per100g: { calories: 250, protein_g: 26, carbs_g: 0, fat_g: 17 } },
  { id: "lentils_cooked", name: "Lentils (cooked)", per100g: { calories: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4 } },
  { id: "chickpeas_cooked", name: "Chickpeas (cooked)", per100g: { calories: 164, protein_g: 9, carbs_g: 27, fat_g: 2.6 } },
  { id: "black_beans_cooked", name: "Black beans (cooked)", per100g: { calories: 132, protein_g: 8.9, carbs_g: 24, fat_g: 0.5 } },
  { id: "roti_wheat", name: "Roti / chapati", per100g: { calories: 297, protein_g: 11, carbs_g: 58, fat_g: 4 }, unit: { label: "roti", gramsPerUnit: 40 } },
  { id: "bread_white", name: "White bread", per100g: { calories: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2 }, unit: { label: "slice", gramsPerUnit: 25 } },
  { id: "bread_wholewheat", name: "Whole wheat bread", per100g: { calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4 }, unit: { label: "slice", gramsPerUnit: 28 } },
  { id: "pasta_cooked", name: "Pasta (cooked)", per100g: { calories: 131, protein_g: 5, carbs_g: 25, fat_g: 1.1 } },
  { id: "potato_boiled", name: "Potato (boiled)", per100g: { calories: 87, protein_g: 1.9, carbs_g: 20, fat_g: 0.1 } },
  { id: "sweet_potato_boiled", name: "Sweet potato (boiled)", per100g: { calories: 90, protein_g: 2, carbs_g: 21, fat_g: 0.1 } },
  { id: "broccoli_cooked", name: "Broccoli (cooked)", per100g: { calories: 35, protein_g: 2.4, carbs_g: 7.2, fat_g: 0.4 } },
  { id: "spinach_cooked", name: "Spinach (cooked)", per100g: { calories: 23, protein_g: 2.9, carbs_g: 3.8, fat_g: 0.3 } },
  { id: "mixed_salad", name: "Mixed green salad", per100g: { calories: 20, protein_g: 1.5, carbs_g: 3.7, fat_g: 0.2 } },
  { id: "avocado", name: "Avocado", per100g: { calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 15 }, unit: { label: "avocado", gramsPerUnit: 200 } },
  { id: "banana", name: "Banana", per100g: { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 }, unit: { label: "banana", gramsPerUnit: 118 } },
  { id: "apple", name: "Apple", per100g: { calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 }, unit: { label: "apple", gramsPerUnit: 182 } },
  { id: "orange", name: "Orange", per100g: { calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1 }, unit: { label: "orange", gramsPerUnit: 131 } },
  { id: "mango", name: "Mango", per100g: { calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4 }, unit: { label: "mango", gramsPerUnit: 200 } },
  { id: "yogurt_plain", name: "Plain yogurt", per100g: { calories: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3 } },
  { id: "greek_yogurt", name: "Greek yogurt (plain)", per100g: { calories: 97, protein_g: 9, carbs_g: 3.9, fat_g: 5 } },
  { id: "milk_whole", name: "Milk, whole", per100g: { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3 } },
  { id: "cheese_cheddar", name: "Cheddar cheese", per100g: { calories: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33 } },
  { id: "almonds", name: "Almonds", per100g: { calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50 } },
  { id: "peanut_butter", name: "Peanut butter", per100g: { calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50 } },
  { id: "olive_oil", name: "Olive oil", per100g: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100 } },
  { id: "oats_cooked", name: "Oats (cooked)", per100g: { calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5 } },
  { id: "quinoa_cooked", name: "Quinoa (cooked)", per100g: { calories: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9 } },
  { id: "pizza_cheese", name: "Cheese pizza", per100g: { calories: 266, protein_g: 11, carbs_g: 33, fat_g: 10 }, unit: { label: "slice", gramsPerUnit: 107 } },
  { id: "french_fries", name: "French fries", per100g: { calories: 312, protein_g: 3.4, carbs_g: 41, fat_g: 15 } },
  { id: "burger_beef", name: "Beef burger (with bun)", per100g: { calories: 250, protein_g: 13, carbs_g: 22, fat_g: 12 }, unit: { label: "burger", gramsPerUnit: 250 } },
  { id: "samosa", name: "Samosa", per100g: { calories: 262, protein_g: 4, carbs_g: 27, fat_g: 15 }, unit: { label: "samosa", gramsPerUnit: 60 } },
  { id: "dal", name: "Dal (lentil curry)", per100g: { calories: 116, protein_g: 7, carbs_g: 15, fat_g: 3 } },
  { id: "biryani_chicken", name: "Chicken biryani", per100g: { calories: 170, protein_g: 8, carbs_g: 20, fat_g: 6 } },
  { id: "sushi_roll", name: "Sushi roll (avg)", per100g: { calories: 150, protein_g: 5, carbs_g: 28, fat_g: 2 } },
  { id: "ice_cream", name: "Ice cream", per100g: { calories: 207, protein_g: 3.5, carbs_g: 24, fat_g: 11 } },
  { id: "dark_chocolate", name: "Dark chocolate", per100g: { calories: 546, protein_g: 4.9, carbs_g: 61, fat_g: 31 } },
];
