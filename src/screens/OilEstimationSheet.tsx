import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { OIL_OPTIONS, OilOption, OilOptionId } from "@/utils/oilEstimation";
import { colors } from "@/theme/colors";

interface OilEstimationSheetProps {
  visible: boolean;
  mealSummary: string;
  selected: OilOptionId;
  onSelect: (option: OilOption) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function OilEstimationSheet({
  visible,
  mealSummary,
  selected,
  onSelect,
  onConfirm,
  onDismiss,
}: OilEstimationSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Tap the scrim to dismiss */}
      <Pressable style={styles.scrim} onPress={onDismiss} />

      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>How was this cooked?</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {mealSummary}
        </Text>

        <View style={styles.optionList}>
          {OIL_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => onSelect(option)}
                activeOpacity={0.75}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>

                {option.extraCalories > 0 && (
                  <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                    <Text
                      style={[
                        styles.badgeText,
                        isSelected && styles.badgeTextSelected,
                      ]}
                    >
                      +{option.extraCalories}
                    </Text>
                    <Text
                      style={[
                        styles.badgeUnit,
                        isSelected && styles.badgeTextSelected,
                      ]}
                    >
                      kcal
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onDismiss} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>Apply & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    // absolute so it sits flush at the bottom over the scrim
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate600,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.slate400,
    fontSize: 13,
    marginBottom: 20,
  },
  optionList: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionSelected: { borderColor: colors.primary },
  optionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate500,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: { flex: 1 },
  optionLabel: {
    color: colors.slate300,
    fontSize: 14,
    fontWeight: "600",
  },
  optionLabelSelected: { color: colors.white },
  optionSubtitle: { color: colors.slate500, fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    minWidth: 52,
  },
  badgeSelected: { backgroundColor: colors.primary },
  badgeText: {
    color: colors.slate400,
    fontSize: 13,
    fontWeight: "700",
  },
  badgeTextSelected: { color: colors.white },
  badgeUnit: { color: colors.slate500, fontSize: 9 },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
  },
  skipText: { color: colors.slate400, fontWeight: "600" },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmText: { color: colors.white, fontWeight: "700" },
});
