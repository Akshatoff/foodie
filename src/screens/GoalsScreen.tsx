import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, GoalSet } from "@/types";
import { useGoalsStore } from "@/store/goalsStore";
import { colors } from "@/theme/colors";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Goals">;

function GoalFields({
  values,
  onChange,
}: {
  values: GoalSet;
  onChange: (v: GoalSet) => void;
}) {
  function field(key: keyof GoalSet, label: string, unit: string) {
    return (
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldInputWrap}>
          <TextInput
            value={String(values[key])}
            onChangeText={(t) => onChange({ ...values, [key]: parseInt(t, 10) || 0 })}
            keyboardType="number-pad"
            style={styles.fieldInput}
          />
          <Text style={styles.fieldUnit}>{unit}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.fieldRow}>
        {field("calories", "Calories", "kcal")}
        {field("protein_g", "Protein", "g")}
      </View>
      <View style={styles.fieldRow}>
        {field("carbs_g", "Carbs", "g")}
        {field("fat_g", "Fat", "g")}
      </View>
    </View>
  );
}

export default function GoalsScreen({ navigation }: Props) {
  const storedDaily = useGoalsStore((s) => s.dailyGoal);
  const storedWeekly = useGoalsStore((s) => s.weeklyGoal);
  const storedWeight = useGoalsStore((s) => s.weightKg);
  const setDailyGoal = useGoalsStore((s) => s.setDailyGoal);
  const setWeeklyGoal = useGoalsStore((s) => s.setWeeklyGoal);
  const setWeightKg = useGoalsStore((s) => s.setWeightKg);

  const [daily, setDaily] = useState<GoalSet>(storedDaily);
  const [weekly, setWeekly] = useState<GoalSet>(storedWeekly);
  const [weight, setWeight] = useState(String(storedWeight));

  function applyDailyTimesSeven() {
    setWeekly({
      calories: daily.calories * 7,
      protein_g: daily.protein_g * 7,
      carbs_g: daily.carbs_g * 7,
      fat_g: daily.fat_g * 7,
    });
  }

  function handleSave() {
    setDailyGoal(daily);
    setWeeklyGoal(weekly);
    setWeightKg(parseInt(weight, 10) || storedWeight);
    navigation.goBack();
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Goals</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Goals</Text>
              <GoalFields values={daily} onChange={setDaily} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Weekly Goals</Text>
                <TouchableOpacity onPress={applyDailyTimesSeven}>
                  <Text style={styles.linkText}>Use daily × 7</Text>
                </TouchableOpacity>
              </View>
              <GoalFields values={weekly} onChange={setWeekly} />
            </View>

            <View style={[styles.card, { marginBottom: 32 }]}>
              <Text style={styles.cardTitle}>Body weight</Text>
              <Text style={styles.weightHint}>
                Used only to estimate water intake and exercise minutes - never
                shared, stored only on this device.
              </Text>
              <View style={[styles.fieldInputWrap, { width: 128 }]}>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="number-pad"
                  style={styles.fieldInput}
                />
                <Text style={styles.fieldUnit}>kg</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
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
  cancelText: { color: colors.slate400, fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "600", fontSize: 16 },
  saveText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  card: { backgroundColor: colors.surfaceLight, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { color: colors.white, fontWeight: "600", marginBottom: 12 },
  linkText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  weightHint: { color: colors.slate500, fontSize: 12, marginBottom: 12, marginTop: 4 },
  fieldRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  fieldLabel: { color: colors.slate400, fontSize: 12, marginBottom: 4 },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  fieldInput: { color: colors.white, paddingVertical: 10, flex: 1 },
  fieldUnit: { color: colors.slate500, fontSize: 12 },
});
