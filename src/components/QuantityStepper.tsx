import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** e.g. "roti" - shown after the number, "×2 roti". Omit for a bare "×2". */
  unitLabel?: string;
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  unitLabel,
}: QuantityStepperProps) {
  function dec() {
    if (value > min) onChange(value - 1);
  }
  function inc() {
    if (value < max) onChange(value + 1);
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={dec}
        disabled={value <= min}
        style={[styles.button, value <= min && styles.buttonDisabled]}
        accessibilityLabel="Decrease quantity"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[styles.buttonText, value <= min && styles.buttonTextDisabled]}>−</Text>
      </TouchableOpacity>

      <Text style={styles.valueText}>
        ×{value}
        {unitLabel ? ` ${unitLabel}${value === 1 ? "" : "s"}` : ""}
      </Text>

      <TouchableOpacity
        onPress={inc}
        disabled={value >= max}
        style={[styles.button, value >= max && styles.buttonDisabled]}
        accessibilityLabel="Increase quantity"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={[styles.buttonText, value >= max && styles.buttonTextDisabled]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600", marginTop: -1 },
  buttonTextDisabled: { color: colors.slate500 },
  valueText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 10,
    minWidth: 32,
    textAlign: "center",
  },
});
