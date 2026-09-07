import React, { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { FoodItem } from "@/types";
import { scaledMacros } from "@/utils/nutrition";
import { colors } from "@/theme/colors";

interface WeightRangeSliderProps {
  item: FoodItem;
  /** Current slider value (grams). Controlled by parent. */
  currentWeight: number;
  onChange: (newWeight: number) => void;
}

/** Color-codes the confidence pill so low confidence jumps out visually. */
const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "#ef4444",
};

export { scaledMacros };

export default function WeightRangeSlider({
  item,
  currentWeight,
  onChange,
}: WeightRangeSliderProps) {
  const min = item.estimated_weight_min_g ?? Math.round(item.estimated_weight_g * 0.6);
  const max = item.estimated_weight_max_g ?? Math.round(item.estimated_weight_g * 1.4);
  const best = item.best_guess_weight_g ?? item.estimated_weight_g;
  const confidence = item.weight_confidence_level ?? "medium";
  const confidenceColor = CONFIDENCE_COLORS[confidence] ?? CONFIDENCE_COLORS.medium;

  const macros = scaledMacros(item, currentWeight);

  const handleChange = useCallback(
    (val: number) => onChange(Math.round(val)),
    [onChange]
  );

  return (
    <View style={styles.wrap}>
      {/* Header row: range label + confidence pill */}
      <View style={styles.headerRow}>
        <Text style={styles.rangeLabel}>
          {min}g – {max}g{" "}
          <Text style={styles.bestGuessInline}>(best guess: {best}g)</Text>
        </Text>
        <View style={[styles.confidencePill, { backgroundColor: confidenceColor + "33" }]}>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {confidence}
          </Text>
        </View>
      </View>

      {/* Explanation */}
      {!!item.confidence_explanation && (
        <Text style={styles.explanation}>{item.confidence_explanation}</Text>
      )}

      {/* Slider */}
      <View style={styles.sliderRow}>
        <Text style={styles.sliderEndLabel}>{min}g</Text>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={5}
          value={currentWeight}
          onValueChange={handleChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surfaceLight}
          thumbTintColor={colors.primary}
        />
        <Text style={styles.sliderEndLabel}>{max}g</Text>
      </View>

      {/* Live readout */}
      <View style={styles.readoutRow}>
        <View style={styles.readoutPill}>
          <Text style={styles.readoutWeight}>{currentWeight}g</Text>
          <Text style={styles.readoutSep}>·</Text>
          <Text style={styles.readoutCal}>{macros.calories} kcal</Text>
          <Text style={styles.readoutSep}>·</Text>
          <Text style={styles.readoutMacro}>{macros.protein_g}g P</Text>
          <Text style={styles.readoutSep}>·</Text>
          <Text style={styles.readoutMacro}>{macros.carbs_g}g C</Text>
          <Text style={styles.readoutSep}>·</Text>
          <Text style={styles.readoutMacro}>{macros.fat_g}g F</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rangeLabel: { color: colors.slate300, fontSize: 12, flex: 1, paddingRight: 8 },
  bestGuessInline: { color: colors.slate500 },
  confidencePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  confidenceDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  confidenceText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  explanation: { color: colors.slate500, fontSize: 11, marginBottom: 8, fontStyle: "italic" },
  sliderRow: { flexDirection: "row", alignItems: "center" },
  sliderEndLabel: { color: colors.slate500, fontSize: 10, width: 30, textAlign: "center" },
  slider: { flex: 1 },
  readoutRow: { alignItems: "center", marginTop: 4 },
  readoutPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  readoutWeight: { color: colors.white, fontWeight: "700", fontSize: 12 },
  readoutCal: { color: colors.primary, fontWeight: "600", fontSize: 12 },
  readoutMacro: { color: colors.slate300, fontSize: 11 },
  readoutSep: { color: colors.slate600, marginHorizontal: 4, fontSize: 11 },
});
