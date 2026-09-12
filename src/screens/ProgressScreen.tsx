import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  rollingAverage,
  rollingAverageSeries,
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

  // 7-day rolling average: smooths out day-to-day AI-estimation noise and
  // the natural variance of what you happen to eat on any single day,
  // giving a more honest number to react to than "today" alone.
  const sevenDayAvg = useMemo(() => rollingAverage(meals, today, 7), [meals]);

  // Directional trend: this week's 7-day average vs. the 7-day average
  // ending a week before that (non-overlapping windows) - tells you
  // whether your average has been climbing, flat, or declining, which a
  // single "7-day average" snapshot on its own can't show.
  const priorSevenDayAvg = useMemo(() => {
    const priorEnd = new Date(today);
    priorEnd.setDate(priorEnd.getDate() - 7);
    return rollingAverage(meals, priorEnd, 7);
  }, [meals]);

  // 14 points, each the 7-day rolling average as of that day - the trend
  // line itself, not just the two endpoints.
  const trendSeries = useMemo(
    () => rollingAverageSeries(meals, today, 14, 7),
    [meals]
  );

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
        {/* 7-day rolling average - always visible regardless of which tab
            is selected below, since it answers a different question
            ("how am I really doing lately") than any single day/week/month
            snapshot can. */}
        <View style={styles.card}>
          <View style={styles.avgHeaderRow}>
            <Text style={styles.avgTitle}>7-Day Average</Text>
            <TrendBadge current={sevenDayAvg.calories} prior={priorSevenDayAvg.calories} />
          </View>
          <Text style={styles.avgSubtitle}>
            Smooths out day-to-day noise - a steadier number to react to than
            any single day.
          </Text>

          <ProgressBar
            label="Calories"
            current={sevenDayAvg.calories}
            goal={dailyGoal.calories}
            color={colors.primary}
          />
          <ProgressBar
            label="Protein"
            current={sevenDayAvg.protein_g}
            goal={dailyGoal.protein_g}
            unit="g"
            color={colors.blue}
          />
          <ProgressBar
            label="Carbs"
            current={sevenDayAvg.carbs_g}
            goal={dailyGoal.carbs_g}
            unit="g"
            color={colors.yellow}
          />
          <ProgressBar
            label="Fat"
            current={sevenDayAvg.fat_g}
            goal={dailyGoal.fat_g}
            unit="g"
            color={colors.orange}
          />

          <View style={styles.trendDivider} />

          <Text style={styles.trendTitle}>Rolling average, last 14 days</Text>
          <View style={styles.chartRow}>
            {trendSeries.map((point) => {
              const pct = Math.min(1, point.average.calories / (dailyGoal.calories || 1));
              const isToday = dateKey(point.date) === dateKey(today);
              return (
                <View key={dateKey(point.date)} style={styles.chartBarWrap}>
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.trendBar,
                        {
                          height: Math.max(4, pct * 96),
                          backgroundColor: isToday ? colors.primary : colors.blue,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.trendCaption}>
            Each bar is the 7-day average as of that day - not that single
            day's intake. A climbing or flat line here matters more for
            steady progress than any one good or bad day.
          </Text>
        </View>

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

/**
 * Shows whether the current 7-day average is trending up, down, or flat
 * versus the prior 7-day period. A small dead zone (±3%) avoids showing a
 * direction arrow for noise-level differences that aren't a real trend.
 */
function TrendBadge({ current, prior }: { current: number; prior: number }) {
  if (prior <= 0) return null;
  const pctChange = (current - prior) / prior;
  const isFlat = Math.abs(pctChange) < 0.03;
  const isUp = pctChange > 0;

  const arrow = isFlat ? "—" : isUp ? "▲" : "▼";
  const color = isFlat ? colors.slate400 : isUp ? colors.primary : colors.orange;
  const delta = Math.round(current - prior);
  const deltaText = isFlat
    ? "flat vs last week"
    : `${delta > 0 ? "+" : ""}${delta} kcal/day vs last week`;

  return (
    <View style={styles.trendBadge}>
      <Text style={[styles.trendBadgeArrow, { color }]}>{arrow}</Text>
      <Text style={[styles.trendBadgeText, { color }]}>{deltaText}</Text>
    </View>
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
  avgHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avgTitle: { color: colors.white, fontWeight: "600", fontSize: 15 },
  avgSubtitle: { color: colors.slate500, fontSize: 11, marginBottom: 16, marginTop: 2 },
  trendBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendBadgeArrow: { fontSize: 12, fontWeight: "700" },
  trendBadgeText: { fontSize: 11, fontWeight: "600" },
  trendDivider: {
    height: 1,
    backgroundColor: colors.surface,
    marginTop: 4,
    marginBottom: 16,
  },
  trendTitle: { color: colors.slate300, fontSize: 12, fontWeight: "600", marginBottom: 10 },
  trendBar: { width: 10, borderRadius: 999 },
  trendCaption: { color: colors.slate500, fontSize: 10, marginTop: 10, lineHeight: 15 },
  chartTitle: { color: colors.white, fontWeight: "600", marginBottom: 12 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 128 },
  chartBarWrap: { alignItems: "center", flex: 1 },
  chartBarTrack: { flex: 1, justifyContent: "flex-end" },
  chartBar: { width: 16, borderRadius: 999 },
  chartBarLabel: { color: colors.slate500, fontSize: 10, marginTop: 8 },
  monthlyHint: { color: colors.slate400, fontSize: 12 },
});
