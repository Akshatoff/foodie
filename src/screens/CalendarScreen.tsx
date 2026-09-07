import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { useMealStore } from "@/store/mealStore";
import { useGoalsStore } from "@/store/goalsStore";
import {
  daysOfWeek,
  groupByDateKey,
  sumMacros,
  isGoalMet,
  computeStreak,
  dateKey,
} from "@/utils/nutrition";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Calendar">;

const WEEKDAY_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A week-at-a-time agenda instead of a month grid. Three separate attempts
 * at a 7-column month grid (percentage widths, then computed pixel widths,
 * then flex:1, then disabling font scaling) all still produced garbled/
 * truncated day numbers on-device in ways that were hard to reproduce and
 * diagnose remotely - each fix addressed a real potential cause but
 * something about fitting a two-character number into a small fixed-size
 * circle kept breaking on the actual device. This sidesteps that whole
 * problem: each day gets its own full-width row with plenty of room, so
 * there's no small/shared-width cell for a date number to get squeezed
 * into or truncated within. If month-grid view is wanted back later, it's
 * worth debugging on-device (e.g. a temporary on-screen log of the actual
 * rendered string) rather than guessing again.
 */
export default function CalendarScreen({ navigation }: Props) {
  const meals = useMealStore((s) => s.meals);
  const dailyGoal = useGoalsStore((s) => s.dailyGoal);
  const [weekCursor, setWeekCursor] = useState(new Date());

  const streak = useMemo(() => computeStreak(meals, dailyGoal, new Date()), [meals, dailyGoal]);
  const grouped = useMemo(() => groupByDateKey(meals), [meals]);
  const week = useMemo(() => daysOfWeek(weekCursor), [weekCursor]);

  const today = new Date();

  const rangeLabel = useMemo(() => {
    const start = week[0];
    const end = week[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }, [week]);

  function changeWeek(delta: number) {
    setWeekCursor((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <View>
          <Text style={styles.streakValue}>
            {streak} day{streak === 1 ? "" : "s"}
          </Text>
          <Text style={styles.streakLabel}>current streak</Text>
        </View>
      </View>

      <View style={styles.weekNavRow}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekNavButton}>
          <Text style={styles.weekNavArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{rangeLabel}</Text>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekNavButton}>
          <Text style={styles.weekNavArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {week.map((day, idx) => {
          const key = dateKey(day);
          const dayMeals = grouped[key];
          const hasMeals = !!dayMeals && dayMeals.length > 0;
          const totals = hasMeals ? sumMacros(dayMeals) : null;
          const met = totals ? isGoalMet(totals, dailyGoal) : false;
          const isToday = key === dateKey(today);
          const isFuture = day > today;

          return (
            <View
              key={key}
              style={[styles.dayRow, isToday && styles.dayRowToday]}
            >
              <View style={styles.dayLeft}>
                <Text style={styles.weekdayText}>{WEEKDAY_FULL[idx]}</Text>
                <Text style={[styles.dateText, isFuture && styles.dateTextFuture]}>
                  {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Text>
                {isToday && <Text style={styles.todayTag}>Today</Text>}
              </View>

              <View style={styles.dayRight}>
                {isFuture ? (
                  <Text style={styles.futureText}>—</Text>
                ) : hasMeals ? (
                  <>
                    <Text style={styles.caloriesText}>{totals!.calories} kcal</Text>
                    <View
                      style={[
                        styles.statusDot,
                        met ? styles.statusDotMet : styles.statusDotMissed,
                      ]}
                    />
                  </>
                ) : (
                  <Text style={styles.noDataText}>No meals logged</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Goal met</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.dangerMuted }]} />
          <Text style={styles.legendText}>Logged, goal missed</Text>
        </View>
      </View>
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
  streakCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  streakEmoji: { fontSize: 28, marginRight: 12 },
  streakValue: { color: colors.white, fontSize: 20, fontWeight: "bold" },
  streakLabel: { color: colors.slate400, fontSize: 12 },
  weekNavRow: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekNavButton: { paddingHorizontal: 16, paddingVertical: 6 },
  weekNavArrow: { color: colors.white, fontSize: 20 },
  weekLabel: { color: colors.white, fontWeight: "600", fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  dayRowToday: { borderWidth: 1, borderColor: colors.primary },
  dayLeft: { flexDirection: "row", alignItems: "center" },
  weekdayText: { color: colors.slate400, fontSize: 13, width: 40 },
  dateText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  dateTextFuture: { color: colors.slate500 },
  todayTag: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 8,
    textTransform: "uppercase",
  },
  dayRight: { flexDirection: "row", alignItems: "center" },
  caloriesText: { color: colors.slate300, fontSize: 13, marginRight: 10 },
  futureText: { color: colors.slate600, fontSize: 13 },
  noDataText: { color: colors.slate600, fontSize: 12, fontStyle: "italic" },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotMet: { backgroundColor: colors.primary },
  statusDotMissed: { backgroundColor: colors.dangerMuted },
  legendRow: { marginHorizontal: 20, marginTop: 4, marginBottom: 12, flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { color: colors.slate400, fontSize: 12 },
});
