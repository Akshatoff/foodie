import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { EXERCISE_OPTIONS } from "@/data/exercises";
import { minutesToBurn } from "@/utils/nutrition";
import { colors } from "@/theme/colors";

interface ExerciseSuggestionsProps {
  excessCalories: number;
  weightKg: number;
}

// A varied mix (low/moderate/high intensity) rather than every option.
const SUGGESTED_IDS = ["walk_brisk", "cycling_moderate", "jogging", "swimming"];

export default function ExerciseSuggestions({
  excessCalories,
  weightKg,
}: ExerciseSuggestionsProps) {
  if (excessCalories <= 0) return null;

  const options = EXERCISE_OPTIONS.filter((e) => SUGGESTED_IDS.includes(e.id));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>A bit over your calorie goal today</Text>
      <Text style={styles.subtitle}>
        No need to "make up" for it in one go - consistency over time matters
        far more than any single day. If you feel like moving, here are some
        options and roughly how long they'd take:
      </Text>

      {options.map((ex) => (
        <View key={ex.id} style={styles.row}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <Text style={styles.minutes}>
            ~{minutesToBurn(ex, excessCalories, weightKg)} min
          </Text>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        Rough estimates based on general activity averages, not personalized
        or medical advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  title: { color: colors.white, fontWeight: "600", marginBottom: 4 },
  subtitle: { color: colors.slate400, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  exerciseName: { color: colors.slate200, fontSize: 14 },
  minutes: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  disclaimer: { color: colors.slate500, fontSize: 11, marginTop: 12 },
});
