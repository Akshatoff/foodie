import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { Recipe, RecipeIngredientRef } from "@/types/recipes";

interface RecipeStore {
  recipes: Recipe[];
  addRecipe: (name: string, ingredients: RecipeIngredientRef[], servings: number) => string;
  updateRecipe: (
    id: string,
    updates: { name?: string; ingredients?: RecipeIngredientRef[]; servings?: number }
  ) => void;
  removeRecipe: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      recipes: [],

      addRecipe: (name, ingredients, servings) => {
        const id = uuid.v4() as string;
        const now = new Date().toISOString();
        const recipe: Recipe = {
          id,
          name: name.trim() || "Untitled Recipe",
          ingredients,
          servings: Math.max(1, servings),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ recipes: [recipe, ...state.recipes] }));
        return id;
      },

      updateRecipe: (id, updates) => {
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(updates.name !== undefined ? { name: updates.name.trim() || r.name } : {}),
                  ...(updates.ingredients !== undefined ? { ingredients: updates.ingredients } : {}),
                  ...(updates.servings !== undefined
                    ? { servings: Math.max(1, updates.servings) }
                    : {}),
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
      },

      removeRecipe: (id) => {
        set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) }));
      },

      getRecipeById: (id) => get().recipes.find((r) => r.id === id),
    }),
    {
      name: "ai-food-tracker/recipes",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
