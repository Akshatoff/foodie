import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LoggedMeal } from "@/types";
import { formatTime } from "@/utils/format";
import { colors } from "@/theme/colors";

interface MealListItemProps {
  meal: LoggedMeal;
  onDelete: (id: string) => void;
  /** Opens the meal for editing (e.g. adjusting quantity) when provided. */
  onPress?: (meal: LoggedMeal) => void;
}

export default function MealListItem({ meal, onDelete, onPress }: MealListItemProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={onPress ? () => onPress(meal) : undefined}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        {meal.imageUri ? (
          <Image source={{ uri: meal.imageUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 18 }}>🍽️</Text>
          </View>
        )}
        <View style={styles.middle}>
          <Text style={styles.title} numberOfLines={1}>
            {meal.meal_summary}
          </Text>
          <Text style={styles.subtitle}>
            {formatTime(meal.loggedAt)} · {meal.items.length}{" "}
            {meal.items.length === 1 ? "item" : "items"}
          </Text>
          {meal.tags.length > 0 && (
            <View style={styles.tagRow}>
              {meal.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.caloriesBlock}>
          <Text style={styles.calories}>{meal.total_calories}</Text>
          <Text style={styles.kcalLabel}>kcal</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onDelete(meal.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Delete ${meal.meal_summary}`}
      >
        <Text style={styles.deleteX}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center" },
  thumb: { width: 64, height: 64, borderRadius: 12, marginRight: 12 },
  thumbPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: { flex: 1 },
  title: { color: colors.white, fontWeight: "600" },
  subtitle: { color: colors.slate400, fontSize: 12, marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 4 },
  tagChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { color: colors.slate400, fontSize: 10 },
  caloriesBlock: { alignItems: "flex-end", marginRight: 8 },
  calories: { color: colors.primary, fontWeight: "bold", fontSize: 16 },
  kcalLabel: { color: colors.slate500, fontSize: 11 },
  deleteX: { color: colors.slate500, fontSize: 18, paddingHorizontal: 4 },
});
