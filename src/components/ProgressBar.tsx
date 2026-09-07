import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

interface ProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color?: string;
}

export default function ProgressBar({
  label,
  current,
  goal,
  unit = "",
  color = colors.primary,
}: ProgressBarProps) {
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const over = goal > 0 && current > goal;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(current)}
          {unit} / {Math.round(goal)}
          {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: over ? colors.orange : color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: { color: colors.slate300, fontSize: 14 },
  value: { color: colors.slate400, fontSize: 12 },
  track: {
    height: 10,
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
});
