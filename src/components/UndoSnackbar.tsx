import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LoggedMeal } from "@/types";
import { colors } from "@/theme/colors";

interface UndoSnackbarProps {
  deletedMeal: LoggedMeal;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoSnackbar({ deletedMeal, onUndo, onDismiss }: UndoSnackbarProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>
        Deleted "{deletedMeal.meal_summary}"
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onUndo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 16 }}
        >
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 110,
    backgroundColor: colors.slate600,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  text: { color: colors.white, fontSize: 13, flex: 1, paddingRight: 12 },
  actions: { flexDirection: "row", alignItems: "center" },
  undoText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  dismissText: { color: colors.slate300, fontSize: 16 },
});
