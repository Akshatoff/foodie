import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { FoodItem } from "@/types";
import { PORTION_PRESETS, PortionPreset, applyPortionPreset } from "@/utils/portionEstimation";
import { colors } from "@/theme/colors";

interface PortionConfirmSheetProps {
  visible: boolean;
  item: FoodItem | null;
  /** 1-indexed position and total count, e.g. "1 of 2" - only shown when
   * confirming multiple low-confidence items in sequence. */
  position?: { current: number; total: number };
  /** Fires immediately on tap - this IS the confirmation, no separate button. */
  onPick: (preset: PortionPreset, weight: number) => void;
}

export default function PortionConfirmSheet({
  visible,
  item,
  position,
  onPick,
}: PortionConfirmSheetProps) {
  // Precompute each preset's resulting weight/calories so the buttons show
  // real numbers, not just "Small/Medium/Large" labels.
  const previews = useMemo(() => {
    if (!item) return [];
    return PORTION_PRESETS.map((preset) => ({
      preset,
      ...applyPortionPreset(item, preset),
    }));
  }, [item]);

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} />

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.lowConfidenceBadgeIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>How much {item.food_name.toLowerCase()}?</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {item.confidence_explanation || "Portion size was hard to judge from the photo."}
              </Text>
            </View>
            {position && position.total > 1 && (
              <View style={styles.positionPill}>
                <Text style={styles.positionText}>
                  {position.current}/{position.total}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.optionsRow}>
            {previews.map(({ preset, weight, macros }) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.optionCard,
                  preset.id === "medium" && styles.optionCardRecommended,
                ]}
                onPress={() => onPick(preset, weight)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{preset.emoji}</Text>
                <Text style={styles.optionLabel}>{preset.label}</Text>
                <Text style={styles.optionWeight}>{weight}g</Text>
                <Text style={styles.optionCalories}>{macros.calories} kcal</Text>
                {preset.id === "medium" && (
                  <View style={styles.recommendedTag}>
                    <Text style={styles.recommendedTagText}>AI ESTIMATE</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hintText}>Tap a size - you can still fine-tune after.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  lowConfidenceBadgeIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  title: { color: colors.white, fontSize: 16, fontWeight: "700" },
  subtitle: { color: colors.slate400, fontSize: 12, marginTop: 4 },
  positionPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  positionText: { color: colors.slate400, fontSize: 11, fontWeight: "600" },
  optionsRow: { flexDirection: "row", gap: 10 },
  optionCard: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionCardRecommended: { borderColor: colors.primary },
  optionEmoji: { fontSize: 26, marginBottom: 6 },
  optionLabel: {
    color: colors.slate300,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  optionWeight: { color: colors.white, fontSize: 15, fontWeight: "800" },
  optionCalories: { color: colors.primary, fontSize: 12, fontWeight: "600", marginTop: 2 },
  recommendedTag: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedTagText: { color: colors.white, fontSize: 8, fontWeight: "800" },
  hintText: {
    color: colors.slate500,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
});
