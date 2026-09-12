import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, LoggedMeal } from "@/types";
import { useMealStore } from "@/store/mealStore";
import { useGoalsStore } from "@/store/goalsStore";
import MacroStat from "@/components/MacroStat";
import MealListItem from "@/components/MealListItem";
import TagFilterBar from "@/components/TagFilterBar";
import WaterIntakeCard from "@/components/WaterIntakeCard";
import ExerciseSuggestions from "@/components/ExerciseSuggestions";
import UndoSnackbar from "@/components/UndoSnackbar";
import { usePendingQueueStore } from "@/store/pendingQueueStore";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const meals = useMealStore((s) => s.getTodaysMeals());
  const totals = useMealStore((s) => s.getTodaysTotals());
  const removeMeal = useMealStore((s) => s.removeMeal);
  const lastDeleted = useMealStore((s) => s.lastDeleted);
  const undoDelete = useMealStore((s) => s.undoDelete);
  const dismissUndo = useMealStore((s) => s.dismissUndo);
  const pendingCount = usePendingQueueStore((s) => s.entries.length);
  const dailyGoal = useGoalsStore((s) => s.dailyGoal);
  const weightKg = useGoalsStore((s) => s.weightKg);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  function handleEditMeal(meal: LoggedMeal) {
    navigation.navigate("Results", {
      imageUri: meal.imageUri,
      analysis: {
        meal_summary: meal.meal_summary,
        total_calories: meal.total_calories,
        items: meal.items,
        source: meal.source,
      },
      mealId: meal.id,
    });
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const filteredMeals = useMemo(() => {
    if (!selectedTag) return meals;
    return meals.filter((m) => m.tags.includes(selectedTag));
  }, [meals, selectedTag]);

  const excessCalories = Math.max(0, totals.calories - dailyGoal.calories);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.headerTitle}>Today's Nutrition</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Goals")}
              accessibilityLabel="Goals"
              style={styles.iconButton}
            >
              <Text style={styles.iconText}>🎯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Progress")}
              accessibilityLabel="Progress"
              style={styles.iconButton}
            >
              <Text style={styles.iconText}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Calendar")}
              accessibilityLabel="Calendar"
              style={styles.iconButton}
            >
              <Text style={styles.iconText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("CorrectionSettings")}
              accessibilityLabel="Correction Settings"
              style={styles.iconButton}
            >
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {pendingCount > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate("PendingQueue")}
              style={styles.pendingBanner}
              activeOpacity={0.8}
            >
              <Text style={styles.pendingBannerEmoji}>⏳</Text>
              <Text style={styles.pendingBannerText}>
                {pendingCount} meal{pendingCount === 1 ? "" : "s"} waiting to sync
              </Text>
              <Text style={styles.pendingBannerArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Daily summary card */}
          <View style={styles.summaryCard}>
            <MacroStat label="Calories" value={totals.calories} unit="" color={colors.primary} />
            <MacroStat label="Protein" value={totals.protein_g} unit="g" color={colors.blue} />
            <MacroStat label="Carbs" value={totals.carbs_g} unit="g" color={colors.yellow} />
            <MacroStat label="Fat" value={totals.fat_g} unit="g" color={colors.orange} />
          </View>

          {/* Water */}
          <View style={styles.sectionMargin}>
            <WaterIntakeCard weightKg={weightKg} caloriesConsumedToday={totals.calories} />
          </View>

          {/* Movement suggestions if over goal */}
          <View style={styles.horizontalMargin}>
            <ExerciseSuggestions excessCalories={excessCalories} weightKg={weightKg} />
          </View>

          {/* Tag filter */}
          <View style={styles.tagFilterWrap}>
            <TagFilterBar selectedTag={selectedTag} onSelect={setSelectedTag} />
          </View>

          {/* Meal list */}
          <View style={styles.mealListWrap}>
            <Text style={styles.sectionTitle}>
              {selectedTag ? `${selectedTag} (${filteredMeals.length})` : "Logged Meals"}
            </Text>
            {filteredMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {selectedTag
                    ? `No meals tagged "${selectedTag}" yet today.`
                    : "No meals logged yet today. Tap the + button to snap your first meal."}
                </Text>
              </View>
            ) : (
              <FlatList<LoggedMeal>
                data={filteredMeals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <MealListItem meal={item} onDelete={removeMeal} onPress={handleEditMeal} />
                )}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 120 }}
              />
            )}
          </View>
        </ScrollView>

        {/* Secondary action: manual entry, no camera/AI required */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ManualEntry", {})}
          activeOpacity={0.85}
          accessibilityLabel="Log meal manually"
          style={styles.manualEntryButton}
        >
          <Text style={styles.manualEntryIcon}>✎</Text>
        </TouchableOpacity>

        {/* Floating action button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Camera")}
          activeOpacity={0.85}
          accessibilityLabel="Log meal"
          style={styles.fab}
        >
          <Text style={styles.fabPlus}>+</Text>
        </TouchableOpacity>

        {lastDeleted && (
          <UndoSnackbar
            deletedMeal={lastDeleted}
            onUndo={undoDelete}
            onDismiss={dismissUndo}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pendingBannerEmoji: { fontSize: 16, marginRight: 10 },
  pendingBannerText: { color: "#f59e0b", fontSize: 13, fontWeight: "600", flex: 1 },
  pendingBannerArrow: { color: "#f59e0b", fontSize: 18, fontWeight: "700" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { color: colors.slate400, fontSize: 14 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: "bold", marginTop: 4 },
  headerIcons: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16 },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surfaceLight,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionMargin: { marginHorizontal: 20, marginTop: 16 },
  horizontalMargin: { marginHorizontal: 20 },
  tagFilterWrap: { marginTop: 24, paddingLeft: 20 },
  mealListWrap: { paddingHorizontal: 20, marginTop: 16, minHeight: 200 },
  sectionTitle: { color: colors.white, fontWeight: "600", marginBottom: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyStateText: { color: colors.slate500, textAlign: "center", paddingHorizontal: 32 },
  manualEntryButton: {
    position: "absolute",
    bottom: 44,
    right: 96,
    backgroundColor: colors.surfaceLight,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  manualEntryIcon: { color: colors.white, fontSize: 18 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabPlus: { color: colors.white, fontSize: 32, fontWeight: "300", marginBottom: 4 },
});
