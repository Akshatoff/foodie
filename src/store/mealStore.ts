import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { LoggedMeal, MealAnalysis, Macros } from "@/types";
import { mealsForDate, sumMacros, emptyMacros } from "@/utils/nutrition";

/** How long the "Undo" option stays available after deleting a meal. */
const UNDO_WINDOW_MS = 6000;

interface MealStore {
  meals: LoggedMeal[];
  /** The most recently deleted meal, kept around (in memory only - not
   * persisted to disk) so it can be restored via undoDelete(). Cleared
   * automatically after UNDO_WINDOW_MS, or immediately on restore/dismiss. */
  lastDeleted: LoggedMeal | null;
  /** Adds an analyzed/manual meal (with its captured photo, if any) to the
   * log, tagged with one or more tags (e.g. ["Lunch"]). */
  addMeal: (imageUri: string, analysis: MealAnalysis, tags: string[]) => void;
  /** Overwrites items/total_calories/tags on an already-saved meal - used
   * when reopening a logged meal to adjust quantity instead of re-adding it
   * as a brand new entry. */
  updateMeal: (
    id: string,
    updates: Pick<MealAnalysis, "items" | "total_calories"> & { tags: string[] }
  ) => void;
  /** Removes a meal and stashes it in `lastDeleted` so it can be undone. */
  removeMeal: (id: string) => void;
  /** Re-inserts the most recently deleted meal exactly as it was (same id,
   * timestamp, tags) and clears the undo state. No-op if nothing pending. */
  undoDelete: () => void;
  /** Dismisses the pending undo without restoring anything (e.g. the undo
   * banner's window expired, or the user tapped elsewhere to dismiss it). */
  dismissUndo: () => void;
  /** Meals logged on the current calendar day, most recent first. */
  getTodaysMeals: () => LoggedMeal[];
  /** Summed macros for meals logged today. */
  getTodaysTotals: () => Macros;
}

let undoTimer: ReturnType<typeof setTimeout> | null = null;

export const useMealStore = create<MealStore>()(
  persist(
    (set, get) => ({
      meals: [],
      lastDeleted: null,

      addMeal: (imageUri, analysis, tags) => {
        const newMeal: LoggedMeal = {
          ...analysis,
          id: uuid.v4() as string,
          imageUri,
          loggedAt: new Date().toISOString(),
          tags: tags.length > 0 ? tags : ["Snacks"],
        };
        set((state) => ({ meals: [newMeal, ...state.meals] }));
      },

      removeMeal: (id) => {
        const deleted = get().meals.find((m) => m.id === id) ?? null;
        set((state) => ({
          meals: state.meals.filter((m) => m.id !== id),
          lastDeleted: deleted,
        }));

        if (undoTimer) clearTimeout(undoTimer);
        if (deleted) {
          undoTimer = setTimeout(() => {
            // Only clear if it's still the same deletion (avoids clobbering
            // a newer one if the user deleted something else in the
            // meantime before this timer fired).
            if (get().lastDeleted?.id === deleted.id) {
              set({ lastDeleted: null });
            }
          }, UNDO_WINDOW_MS);
        }
      },

      undoDelete: () => {
        const { lastDeleted, meals } = get();
        if (!lastDeleted) return;
        if (undoTimer) clearTimeout(undoTimer);
        // Restore it back into its original chronological position rather
        // than just prepending, so undoing an older delete doesn't make it
        // look like a brand new entry at the top of today's list.
        const restored = [...meals, lastDeleted].sort(
          (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
        );
        set({ meals: restored, lastDeleted: null });
      },

      dismissUndo: () => {
        if (undoTimer) clearTimeout(undoTimer);
        set({ lastDeleted: null });
      },

      updateMeal: (id, updates) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === id
              ? {
                  ...m,
                  items: updates.items,
                  total_calories: updates.total_calories,
                  tags: updates.tags.length > 0 ? updates.tags : ["Snacks"],
                }
              : m
          ),
        }));
      },

      getTodaysMeals: () => {
        return mealsForDate(get().meals, new Date()).sort(
          (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
        );
      },

      getTodaysTotals: () => {
        const todays = mealsForDate(get().meals, new Date());
        return todays.length === 0 ? emptyMacros() : sumMacros(todays);
      },
    }),
    {
      name: "ai-food-tracker/meals",
      storage: createJSONStorage(() => AsyncStorage),
      // lastDeleted is intentionally ephemeral (undo should only apply to
      // the current app session) - exclude it from what gets persisted so
      // a leftover deleted meal can't reappear on next launch.
      partialize: (state) => ({ meals: state.meals }),
    }
  )
);
