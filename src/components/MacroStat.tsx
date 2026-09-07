import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

interface MacroStatProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

export default function MacroStat({ label, value, unit, color }: MacroStatProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color }]}>
        {Math.round(value)}
        <Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1 },
  value: { fontSize: 22, fontWeight: "bold" },
  unit: { fontSize: 13, fontWeight: "normal" },
  label: {
    color: colors.slate400,
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
