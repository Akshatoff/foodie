import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import {
  useCorrectionStore,
  CorrectionPresetKey,
  CORRECTION_PRESET_LABELS,
  DEFAULT_CORRECTION_FACTORS,
} from "@/store/correctionStore";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CorrectionSettings">;

const EDITABLE_PRESETS: CorrectionPresetKey[] = [
  "restaurant_multiplier",
  "curry_multiplier",
  "home_cooked_multiplier",
  "global_multiplier",
];

export default function CorrectionSettingsScreen({ navigation }: Props) {
  const enabled = useCorrectionStore((s) => s.enabled);
  const factors = useCorrectionStore((s) => s.factors);
  const setEnabled = useCorrectionStore((s) => s.setEnabled);
  const setFactor = useCorrectionStore((s) => s.setFactor);
  const resetToDefaults = useCorrectionStore((s) => s.resetToDefaults);

  // Local draft values so inputs don't round-trip through store on every keystroke.
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EDITABLE_PRESETS.map((k) => [
        k,
        String(Math.round((factors[k] - 1) * 100)),
      ])
    )
  );

  function commitDraft(key: CorrectionPresetKey) {
    const raw = parseInt(drafts[key] ?? "0", 10);
    const clampedPct = Math.max(0, Math.min(100, isNaN(raw) ? 0 : raw));
    setDrafts((prev) => ({ ...prev, [key]: String(clampedPct) }));
    setFactor(key, 1 + clampedPct / 100);
  }

  function handleReset() {
    resetToDefaults();
    setDrafts(
      Object.fromEntries(
        EDITABLE_PRESETS.map((k) => [
          k,
          String(Math.round((DEFAULT_CORRECTION_FACTORS[k] - 1) * 100)),
        ])
      )
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Correction Factors</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Master toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enable corrections</Text>
              <Text style={styles.cardSubtitle}>
                Applies a hidden-fat multiplier to calories and fat when you
                choose a preset on the meal-logging screen. Protein and carbs
                are never affected.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.surfaceLight, true: colors.primary + "88" }}
              thumbColor={enabled ? colors.primary : colors.slate500}
            />
          </View>
        </View>

        {/* Editable presets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preset adjustments</Text>
          <Text style={styles.cardSubtitle}>
            Set the extra % added to calories & fat for each cooking context.
            0 = no adjustment. Max 100%.
          </Text>

          {EDITABLE_PRESETS.map((key) => (
            <View key={key} style={styles.presetRow}>
              <Text style={styles.presetLabel} numberOfLines={2}>
                {CORRECTION_PRESET_LABELS[key]}
              </Text>
              <View style={styles.percentInputWrap}>
                <TextInput
                  style={styles.percentInput}
                  value={drafts[key]}
                  onChangeText={(t) =>
                    setDrafts((prev) => ({ ...prev, [key]: t.replace(/[^0-9]/g, "") }))
                  }
                  onBlur={() => commitDraft(key)}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="done"
                  onSubmitEditing={() => commitDraft(key)}
                />
                <Text style={styles.percentSign}>%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { marginBottom: 40 }]}>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.cardSubtitle}>
            {"When you tap \"Restaurant\" (+20%) on a 500 kcal meal:\n\n" +
              "• Extra fat = meal fat × 20%  (e.g. 15g → 18g, +3g)\n" +
              "• Extra calories = +3g fat × 9 kcal/g = +27 kcal\n" +
              "• Saved total = 527 kcal\n\n" +
              "Protein and carbs stay the same because the hidden " +
              "underestimation is almost entirely cooking oil, not protein " +
              "sources."}
          </Text>
        </View>
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
  resetText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { color: colors.white, fontWeight: "600", marginBottom: 6 },
  cardSubtitle: { color: colors.slate400, fontSize: 12, lineHeight: 18 },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  presetLabel: { color: colors.slate300, fontSize: 13, flex: 1, paddingRight: 12 },
  percentInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  percentInput: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    width: 44,
    textAlign: "center",
  },
  percentSign: { color: colors.slate400, fontSize: 14, marginLeft: 2 },
});
