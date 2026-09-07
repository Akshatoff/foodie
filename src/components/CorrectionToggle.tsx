import React from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  CorrectionPresetKey,
  CORRECTION_PRESET_LABELS,
  CorrectionFactors,
} from "@/store/correctionStore";
import { multiplierLabel } from "@/utils/correctionFactor";
import { colors } from "@/theme/colors";

/** The preset keys we expose on the meal-logging screen (excludes
 * global_multiplier which is edited in Settings, not per-meal). */
const PER_MEAL_PRESETS: CorrectionPresetKey[] = [
  "restaurant_multiplier",
  "curry_multiplier",
  "home_cooked_multiplier",
];

interface CorrectionToggleProps {
  /** Whether the correction system is globally enabled. */
  enabled: boolean;
  onToggleEnabled: (v: boolean) => void;
  /** Which preset is active for THIS meal (null = no correction). */
  activePreset: CorrectionPresetKey | null;
  onSelectPreset: (key: CorrectionPresetKey | null) => void;
  factors: CorrectionFactors;
  /** Live calorie delta shown in the header, calculated by parent. */
  extraCalories: number;
}

export default function CorrectionToggle({
  enabled,
  onToggleEnabled,
  activePreset,
  onSelectPreset,
  factors,
  extraCalories,
}: CorrectionToggleProps) {
  function handlePresetTap(key: CorrectionPresetKey) {
    // Tapping the active preset deselects it (toggle off).
    onSelectPreset(activePreset === key ? null : key);
    // Enable corrections automatically when a preset is picked.
    if (!enabled) onToggleEnabled(true);
  }

  return (
    <View style={styles.wrap}>
      {/* Master toggle row */}
      <View style={styles.masterRow}>
        <View style={styles.masterLeft}>
          <Text style={styles.masterTitle}>Calorie Correction</Text>
          {enabled && activePreset && extraCalories > 0 ? (
            <Text style={styles.masterSubtitle}>
              +{extraCalories} kcal hidden fat adjustment
            </Text>
          ) : (
            <Text style={styles.masterSubtitle}>
              Compensates for hidden oils & underestimation
            </Text>
          )}
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: colors.surfaceLight, true: colors.primary + "88" }}
          thumbColor={enabled ? colors.primary : colors.slate500}
        />
      </View>

      {/* Preset chips - only show when enabled */}
      {enabled && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          {PER_MEAL_PRESETS.map((key) => {
            const isActive = activePreset === key;
            const multiplier = factors[key];
            const pct = Math.round((multiplier - 1) * 100);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePresetTap(key)}
                style={[styles.chip, isActive && styles.chipActive]}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.chipLabel, isActive && styles.chipLabelActive]}
                  numberOfLines={1}
                >
                  {key === "restaurant_multiplier"
                    ? "🍽 Restaurant"
                    : key === "curry_multiplier"
                    ? "🍛 Curry"
                    : "🏠 Home Cook"}
                </Text>
                <View
                  style={[styles.chipBadge, isActive && styles.chipBadgeActive]}
                >
                  <Text
                    style={[
                      styles.chipBadgeText,
                      isActive && styles.chipBadgeTextActive,
                    ]}
                  >
                    +{pct}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Active preset detail row */}
      {enabled && activePreset && (
        <View style={styles.detailRow}>
          <Text style={styles.detailText}>
            {multiplierLabel(factors[activePreset])} applied to calories & fat.
            Protein & carbs unchanged.
          </Text>
          <TouchableOpacity onPress={() => onSelectPreset(null)}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  masterLeft: { flex: 1, paddingRight: 12 },
  masterTitle: { color: colors.white, fontWeight: "600", fontSize: 14 },
  masterSubtitle: { color: colors.slate400, fontSize: 12, marginTop: 2 },
  chipScroll: { marginTop: 14 },
  chipContent: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 6,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  chipLabel: { color: colors.slate400, fontSize: 13, fontWeight: "500" },
  chipLabelActive: { color: colors.white },
  chipBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipBadgeActive: { backgroundColor: colors.primary },
  chipBadgeText: { color: colors.slate400, fontSize: 11, fontWeight: "700" },
  chipBadgeTextActive: { color: colors.white },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  detailText: { color: colors.slate400, fontSize: 11, flex: 1, paddingRight: 12 },
  clearText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
});
