import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { estimateWaterIntakeMl, mlToGlasses } from "@/utils/nutrition";
import { colors } from "@/theme/colors";

interface WaterIntakeCardProps {
  weightKg: number;
  caloriesConsumedToday: number;
}

export default function WaterIntakeCard({
  weightKg,
  caloriesConsumedToday,
}: WaterIntakeCardProps) {
  const ml = estimateWaterIntakeMl(weightKg, caloriesConsumedToday);
  const glasses = mlToGlasses(ml);

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>💧</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Aim for about {(ml / 1000).toFixed(1)}L today</Text>
        <Text style={styles.subtitle}>
          ≈ {glasses} glasses, based on your weight and what you've logged
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  emoji: { fontSize: 28, marginRight: 12 },
  title: { color: colors.white, fontWeight: "600" },
  subtitle: { color: colors.slate400, fontSize: 12, marginTop: 2 },
});
