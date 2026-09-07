import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Named correction factor presets. Each value is a multiplier applied to
 * calories and fat (not protein - see applyCorrection in correctionFactor.ts
 * for the reasoning). 1.0 = no adjustment.
 *
 * global_multiplier is a catch-all applied when no specific preset is active.
 * restaurant and curry multipliers override it on a per-meal basis via the
 * toggle shown on the Results screen.
 */
export interface CorrectionFactors {
  /** Applied when corrections are enabled but no specific type is selected. */
  global_multiplier: number;
  /** Applied for restaurant / takeaway meals. Default +20%. */
  restaurant_multiplier: number;
  /** Applied for Indian/Asian curries and heavily sauced dishes. Default +15%. */
  curry_multiplier: number;
  /** Applied for home-cooked meals where oil use is uncertain. Default +10%. */
  home_cooked_multiplier: number;
}

export const DEFAULT_CORRECTION_FACTORS: CorrectionFactors = {
  global_multiplier: 1.0,
  restaurant_multiplier: 1.2,
  curry_multiplier: 1.15,
  home_cooked_multiplier: 1.1,
};

export type CorrectionPresetKey = keyof CorrectionFactors;

export const CORRECTION_PRESET_LABELS: Record<CorrectionPresetKey, string> = {
  global_multiplier: "Global (no category)",
  restaurant_multiplier: "Restaurant / Takeaway (+20%)",
  curry_multiplier: "Curry / Sauced Dish (+15%)",
  home_cooked_multiplier: "Home Cooked, uncertain oil (+10%)",
};

interface CorrectionStore {
  factors: CorrectionFactors;
  /** Whether correction is globally enabled. When false, no multiplier is
   * ever applied even if a preset is selected on the Results screen. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  setFactor: (key: CorrectionPresetKey, value: number) => void;
  resetToDefaults: () => void;
}

export const useCorrectionStore = create<CorrectionStore>()(
  persist(
    (set) => ({
      factors: DEFAULT_CORRECTION_FACTORS,
      enabled: true,

      setEnabled: (enabled) => set({ enabled }),

      setFactor: (key, value) =>
        set((state) => ({
          factors: { ...state.factors, [key]: Math.max(1.0, Math.min(2.0, value)) },
        })),

      resetToDefaults: () =>
        set({ factors: DEFAULT_CORRECTION_FACTORS }),
    }),
    {
      name: "ai-food-tracker/corrections",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
