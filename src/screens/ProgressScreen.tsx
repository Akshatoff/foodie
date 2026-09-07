import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, ProgressPeriod, GoalSet, Macros } from "@/types";
import { useMealStore } from "@/store/mealStore";
import { useGoalsStore } from "@/store/goalsStore";
import ProgressBar from "@/components/ProgressBar";
import {
  daysOfWeek,
  daysInMonth,
  mealsInRange,
  sumMacros,
  mealsForDate,
  dateKey,
} from "@/utils/nutrition";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Progress">;

const TABS: { key: ProgressPeriod; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export default function ProgressScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<ProgressPeriod>("daily");
  const meals = useMealStore((s) => s.meals);
  const dailyGoal = useGoalsStore((s) => s.dailyGoal);
  const weeklyGoal = useGoalsStore((s) => s.weeklyGoal);

  const today = new Date();

  const daily = useMemo(() => sumMacros(mealsForDate(meals, today)), [meals]);

  const week = useMemo(() => {
    const days = daysOfWeek(today);
    const totals = sumMacros(mealsInRange(meals, days[0], days[6]));
    const perDay = days.map((d) => ({
      date: d,
      calories: sumMacros(mealsForDate(meals, d)).calories,
    }));
    return { totals, perDay };
  }, [meals]);

  const month = useMemo(() => {
    const days = daysInMonth(today);
    const totals = sumMacros(mealsInRange(meals, days[0], days[days.length - 1]));
    const monthlyGoal: GoalSet = {
      calories: dailyGoal.calories * days.length,
      protein_g: dailyGoal.protein_g * days.length,
      carbs_g: dailyGoal.carbs_g * days.length,
      fat_g: dailyGoal.fat_g * days.length,
    };
    return { totals, monthlyGoal, dayCount: days.length };
  }, [meals, dailyGoal]);

  const goalForPeriod: GoalSet =
    period === "daily" ? dailyGoal : period === "weekly" ? weeklyGoal : month.monthlyGoal;
  const totalsForPeriod: Macros =
    period === "daily" ? daily : period === "weekly" ? week.totals : month.totals;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented control */}
      <View style={styles.segmentWrap}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setPeriod(tab.key)}
            style={[styles.segment, period === tab.key && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, period === tab.key && styles.segmentTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ProgressBar
            label="Calories"
            current={totalsForPeriod.calories}
            goal={goalForPeriod.calories}
            color={colors.primary}
          />
          <ProgressBar
            label="Protein"
            current={totalsForPeriod.protein_g}
            goal={goalForPeriod.protein_g}
            unit="g"
            color={colors.blue}
          />
          <ProgressBar
            label="Carbs"
            current={totalsForPeriod.carbs_g}
            goal={goalForPeriod.carbs_g}
            unit="g"
            color={colors.yellow}
          />
          <ProgressBar
            label="Fat"
            current={totalsForPeriod.fat_g}
            goal={goalForPeriod.fat_g}
            unit="g"
            color={colors.orange}
          />
        </View>

        {period === "weekly" && (
          <View style={[styles.card, { marginBottom: 32 }]}>
            <Text style={styles.chartTitle}>Calories by day</Text>
            <View style={styles.chartRow}>
              {week.perDay.map(({ date, calories }) => {
                const pct = Math.min(1, calories / (dailyGoal.calories || 1));
                const isToday = dateKey(date) === dateKey(today);
                return (
                  <View key={dateKey(date)} style={styles.chartBarWrap}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(4, pct * 96),
                            backgroundColor: isToday ? colors.primary : colors.blue,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartBarLabel}>
                      {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {period === "monthly" && (
          <View style={[styles.card, { marginBottom: 32 }]}>
            <Text style={styles.monthlyHint}>
              Monthly goal is your daily goal × {month.dayCount} days in this month.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backText: { color: colors.slate400, fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "600", fontSize: 16 },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.slate400 },
  segmentTextActive: { color: colors.white },
  card: { backgroundColor: colors.surfaceLight, borderRadius: 16, padding: 16, marginBottom: 20 },
  chartTitle: { color: colors.white, fontWeight: "600", marginBottom: 12 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 128 },
  chartBarWrap: { alignItems: "center", flex: 1 },
  chartBarTrack: { flex: 1, justifyContent: "flex-end" },
  chartBar: { width: 16, borderRadius: 999 },
  chartBarLabel: { color: colors.slate500, fontSize: 10, marginTop: 8 },
  monthlyHint: { color: colors.slate400, fontSize: 12 },
});
