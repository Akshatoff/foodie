import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoalSet } from "@/types";

const DEFAULT_DAILY_GOAL: GoalSet = {
  calories: 2000,
  protein_g: 100,
  carbs_g: 250,
  fat_g: 65,
};

const DEFAULT_WEEKLY_GOAL: GoalSet = {
  calories: DEFAULT_DAILY_GOAL.calories * 7,
  protein_g: DEFAULT_DAILY_GOAL.protein_g * 7,
  carbs_g: DEFAULT_DAILY_GOAL.carbs_g * 7,
  fat_g: DEFAULT_DAILY_GOAL.fat_g * 7,
};

const DEFAULT_WEIGHT_KG = 70;

interface GoalsStore {
  dailyGoal: GoalSet;
  weeklyGoal: GoalSet;
  /** Used only for water-intake and exercise-minute estimates. */
  weightKg: number;
  setDailyGoal: (goal: GoalSet) => void;
  setWeeklyGoal: (goal: GoalSet) => void;
  setWeightKg: (weightKg: number) => void;
  /** Resets weeklyGoal to 7x the current dailyGoal. */
  syncWeeklyToDaily: () => void;
}

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      dailyGoal: DEFAULT_DAILY_GOAL,
      weeklyGoal: DEFAULT_WEEKLY_GOAL,
      weightKg: DEFAULT_WEIGHT_KG,

      setDailyGoal: (goal) => set({ dailyGoal: goal }),
      setWeeklyGoal: (goal) => set({ weeklyGoal: goal }),
      setWeightKg: (weightKg) => set({ weightKg }),

      syncWeeklyToDaily: () => {
        const { dailyGoal } = get();
        set({
          weeklyGoal: {
            calories: dailyGoal.calories * 7,
            protein_g: dailyGoal.protein_g * 7,
            carbs_g: dailyGoal.carbs_g * 7,
            fat_g: dailyGoal.fat_g * 7,
          },
        });
      },
    }),
    {
      name: "ai-food-tracker/goals",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
