import { LoggedMeal, Macros, GoalSet, ExerciseOption, FoodItem } from "@/types";

// ---- Quantity scaling ---------------------------------------------------

/**
 * Returns a copy of `item` scaled to `quantity` instances of it. Always
 * scales from the ORIGINAL item (quantity 1 baseline), never from an
 * already-scaled copy - callers should keep the base item around and
 * re-derive on every quantity change rather than compounding.
 */
/**
 * Scales an item's macros from its best_guess_weight_g to any other target
 * weight. Used by the weight-range slider and the low-confidence portion
 * presets, both of which need to recompute macros for a weight the user
 * picked without re-calling the AI.
 */
export function scaledMacros(item: FoodItem, targetWeight: number): Macros {
  const base = item.best_guess_weight_g ?? item.estimated_weight_g;
  if (base === 0) return item.macros;
  const factor = targetWeight / base;
  return {
    calories: Math.round(item.macros.calories * factor),
    protein_g: Math.round(item.macros.protein_g * factor * 10) / 10,
    carbs_g: Math.round(item.macros.carbs_g * factor * 10) / 10,
    fat_g: Math.round(item.macros.fat_g * factor * 10) / 10,
  };
}

export function scaleFoodItem(item: FoodItem, quantity: number): FoodItem {
  const q = Math.max(1, quantity);
  return {
    ...item,
    estimated_weight_g: Math.round(item.estimated_weight_g * q),
    estimated_weight_min_g: Math.round((item.estimated_weight_min_g ?? item.estimated_weight_g) * q),
    estimated_weight_max_g: Math.round((item.estimated_weight_max_g ?? item.estimated_weight_g) * q),
    best_guess_weight_g: Math.round((item.best_guess_weight_g ?? item.estimated_weight_g) * q),
    macros: {
      calories: Math.round(item.macros.calories * q),
      protein_g: Math.round(item.macros.protein_g * q),
      carbs_g: Math.round(item.macros.carbs_g * q),
      fat_g: Math.round(item.macros.fat_g * q),
    },
    quantity: q,
  };
}

export function unscaleFoodItem(item: FoodItem): FoodItem {
  const q = Math.max(1, item.quantity ?? 1);
  if (q === 1) return { ...item, quantity: undefined };
  return {
    ...item,
    estimated_weight_g: Math.round(item.estimated_weight_g / q),
    estimated_weight_min_g: Math.round((item.estimated_weight_min_g ?? item.estimated_weight_g) / q),
    estimated_weight_max_g: Math.round((item.estimated_weight_max_g ?? item.estimated_weight_g) / q),
    best_guess_weight_g: Math.round((item.best_guess_weight_g ?? item.estimated_weight_g) / q),
    macros: {
      calories: Math.round(item.macros.calories / q),
      protein_g: Math.round(item.macros.protein_g / q),
      carbs_g: Math.round(item.macros.carbs_g / q),
      fat_g: Math.round(item.macros.fat_g / q),
    },
    quantity: undefined,
  };
}


/** Local "YYYY-MM-DD" key - used to group meals by calendar day regardless
 * of what time they were logged. */
export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return dateKey(a) === dateKey(b);
}

/** Monday-start week containing `d`. */
export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysOfWeek(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): Date[] {
  const year = d.getFullYear();
  const month = d.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

// ---- Macro aggregation -------------------------------------------------------

export function emptyMacros(): Macros {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export function sumMacros(meals: LoggedMeal[]): Macros {
  return meals.reduce<Macros>((acc, meal) => {
    for (const item of meal.items) {
      acc.calories += item.macros.calories;
      acc.protein_g += item.macros.protein_g;
      acc.carbs_g += item.macros.carbs_g;
      acc.fat_g += item.macros.fat_g;
    }
    return acc;
  }, emptyMacros());
}

export function mealsForDate(meals: LoggedMeal[], date: Date | string): LoggedMeal[] {
  return meals.filter((m) => isSameDay(m.loggedAt, date));
}

export function mealsInRange(
  meals: LoggedMeal[],
  start: Date,
  end: Date
): LoggedMeal[] {
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  return meals.filter((m) => {
    const k = dateKey(m.loggedAt);
    return k >= startKey && k <= endKey;
  });
}

/** Groups meals by "YYYY-MM-DD" for calendar/streak rendering. */
export function groupByDateKey(meals: LoggedMeal[]): Record<string, LoggedMeal[]> {
  const out: Record<string, LoggedMeal[]> = {};
  for (const meal of meals) {
    const k = dateKey(meal.loggedAt);
    if (!out[k]) out[k] = [];
    out[k].push(meal);
  }
  return out;
}

// ---- Goal evaluation ---------------------------------------------------------

/**
 * A day "counts" toward the streak if you reached a reasonable fraction of
 * your calorie goal. Deliberately lenient and calorie-only: this is a
 * motivational streak, not a strict macro-compliance check.
 *
 * Note: this used to ALSO cap out at 115% of goal (so eating more than 15%
 * over your target still counted as "missed") - that's why days where you
 * clearly hit/exceeded your goal could still show red. Reaching or
 * exceeding your calorie goal should count as "met," full stop - there's
 * no upper bound here anymore. (Also previously required protein >= 85% of
 * its own goal on top of this - dropped in an earlier fix, for the same
 * reason: silent extra conditions that don't match what "completed my
 * daily goal" means to someone looking at the calendar.)
 */
export function isGoalMet(totals: Macros, goal: GoalSet): boolean {
  if (goal.calories <= 0) return false;
  return totals.calories / goal.calories >= 0.85;
}

/**
 * Current streak of consecutive goal-met days ending today (or yesterday,
 * if today has no meals logged yet so it shouldn't break the streak).
 */
export function computeStreak(
  meals: LoggedMeal[],
  goal: GoalSet,
  today: Date = new Date()
): number {
  const grouped = groupByDateKey(meals);
  let streak = 0;
  const cursor = new Date(today);

  // If nothing logged today yet, start counting from yesterday so an
  // in-progress day doesn't zero out the streak prematurely.
  if (!grouped[dateKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = dateKey(cursor);
    const dayMeals = grouped[key];
    if (!dayMeals || dayMeals.length === 0) break;
    const totals = sumMacros(dayMeals);
    if (!isGoalMet(totals, goal)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ---- Water intake estimate ---------------------------------------------------

/**
 * Rough general-wellness heuristic (NOT medical advice): ~35ml per kg of
 * body weight as a baseline, plus a small adjustment for how much was
 * eaten that day (larger intake days warrant a bit more fluid). Rounded to
 * the nearest 50ml.
 */
export function estimateWaterIntakeMl(
  weightKg: number,
  caloriesConsumedToday: number
): number {
  const base = weightKg * 35;
  const foodAdjustment = caloriesConsumedToday * 0.3;
  return Math.round((base + foodAdjustment) / 50) * 50;
}

export function mlToGlasses(ml: number, glassSizeMl = 250): number {
  return Math.round(ml / glassSizeMl);
}

// ---- Exercise / activity estimate --------------------------------------------

/**
 * Minutes of a given activity to burn roughly `calories`, using the
 * standard MET formula: kcal/min = MET x 3.5 x weightKg / 200.
 */
export function minutesToBurn(
  exercise: ExerciseOption,
  calories: number,
  weightKg: number
): number {
  const kcalPerMinute = (exercise.met * 3.5 * weightKg) / 200;
  if (kcalPerMinute <= 0) return 0;
  return Math.max(1, Math.round(calories / kcalPerMinute));
}
