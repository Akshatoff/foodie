import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_TAGS } from "@/types";

interface TagsStore {
  customTags: string[];
  addCustomTag: (name: string) => void;
  /** Default tags followed by custom ones, de-duplicated case-insensitively. */
  getAllTags: () => string[];
}

export const useTagsStore = create<TagsStore>()(
  persist(
    (set, get) => ({
      customTags: [],

      addCustomTag: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const exists = get()
          .getAllTags()
          .some((t) => t.toLowerCase() === trimmed.toLowerCase());
        if (exists) return;
        set((state) => ({ customTags: [...state.customTags, trimmed] }));
      },

      getAllTags: () => {
        const seen = new Set<string>();
        const combined = [...DEFAULT_TAGS, ...get().customTags];
        return combined.filter((t) => {
          const key = t.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      },
    }),
    {
      name: "ai-food-tracker/tags",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
