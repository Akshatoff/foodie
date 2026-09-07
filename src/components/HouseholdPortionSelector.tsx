import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Macros } from "@/types";
import {
  PortionUnitMode,
  PortionResult,
  KatoriSize,
  FlatbreadSize,
  FatUnit,
  KATORI_SIZES,
  FLATBREAD_SIZES,
  FAT_UNITS,
  DensityCategory,
  DENSITY_LABELS,
  macrosForKatori,
  macrosForFlatbread,
  macrosForFatUnit,
} from "@/utils/householdUnits";
import { colors } from "@/theme/colors";

const MODE_LABELS: Record<PortionUnitMode, { title: string; emoji: string }> = {
  katori: { title: "Katori", emoji: "🥣" },
  flatbread: { title: "Roti / Paratha", emoji: "🫓" },
  fat: { title: "Spoon", emoji: "🥄" },
};

interface HouseholdPortionSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  /** Fires when the user taps "Add to Meal" - the caller decides what to
   * do with the resulting weight/macros (append a FoodItem, update an
   * existing one, etc). */
  onConfirm: (result: PortionResult) => void;

  /** Name shown in the sheet header, e.g. "Toor Dal" or "Ghee". */
  foodName: string;

  /** Which unit modes to offer as tabs. Order is preserved. Pass a single
   * mode to skip the tab bar entirely (e.g. a ghee/oil item only ever
   * needs "fat" mode). */
  availableModes: PortionUnitMode[];

  // --- Mode-specific data - only the fields matching availableModes need
  // to be provided by the caller. ---

  /** Required for "katori" mode: the food's per-100g macros on a COOKED/
   * as-eaten basis. */
  foodMacrosPer100g?: Macros;
  /** Required for "katori" mode: which density to use for volume->weight. */
  densityCategory?: DensityCategory;

  /** Required for "flatbread" mode: raw flour's per-100g macros. */
  flourMacrosPer100g?: Macros;
  /** Required for "flatbread" and "fat" modes: raw fat's (ghee/oil)
   * per-100g macros. */
  fatMacrosPer100g?: Macros;
}

export default function HouseholdPortionSelector({
  visible,
  onDismiss,
  onConfirm,
  foodName,
  availableModes,
  foodMacrosPer100g,
  densityCategory = "generic_solid",
  flourMacrosPer100g,
  fatMacrosPer100g,
}: HouseholdPortionSelectorProps) {
  const [activeMode, setActiveMode] = useState<PortionUnitMode>(availableModes[0]);
  const [selectedKatoriId, setSelectedKatoriId] = useState<string>(KATORI_SIZES[1].id);
  const [selectedFlatbreadId, setSelectedFlatbreadId] = useState<string>(FLATBREAD_SIZES[1].id);
  const [selectedFatId, setSelectedFatId] = useState<string>(FAT_UNITS[0].id);

  const result: PortionResult | null = useMemo(() => {
    if (activeMode === "katori" && foodMacrosPer100g) {
      const size = KATORI_SIZES.find((k) => k.id === selectedKatoriId) ?? KATORI_SIZES[1];
      return macrosForKatori(foodMacrosPer100g, size, densityCategory);
    }
    if (activeMode === "flatbread" && flourMacrosPer100g && fatMacrosPer100g) {
      const size = FLATBREAD_SIZES.find((s) => s.id === selectedFlatbreadId) ?? FLATBREAD_SIZES[1];
      return macrosForFlatbread(flourMacrosPer100g, fatMacrosPer100g, size);
    }
    if (activeMode === "fat" && fatMacrosPer100g) {
      const unit = FAT_UNITS.find((u) => u.id === selectedFatId) ?? FAT_UNITS[0];
      return macrosForFatUnit(fatMacrosPer100g, unit);
    }
    return null;
  }, [
    activeMode,
    selectedKatoriId,
    selectedFlatbreadId,
    selectedFatId,
    foodMacrosPer100g,
    densityCategory,
    flourMacrosPer100g,
    fatMacrosPer100g,
  ]);

  function handleConfirm() {
    if (!result) return;
    onConfirm(result);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>How much {foodName.toLowerCase()}?</Text>
        <Text style={styles.subtitle}>Use a household measure instead of a scale</Text>

        {/* Mode tabs - only shown when more than one mode is available */}
        {availableModes.length > 1 && (
          <View style={styles.tabRow}>
            {availableModes.map((mode) => {
              const isActive = activeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setActiveMode(mode)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={styles.tabEmoji}>{MODE_LABELS[mode].emoji}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {MODE_LABELS[mode].title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Preset cards for the active mode */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {activeMode === "katori" &&
            KATORI_SIZES.map((size) => (
              <PresetCard
                key={size.id}
                emoji={size.emoji}
                label={size.label}
                detail={`${size.volumeMl}ml`}
                selected={selectedKatoriId === size.id}
                onPress={() => setSelectedKatoriId(size.id)}
              />
            ))}
          {activeMode === "flatbread" &&
            FLATBREAD_SIZES.map((size) => (
              <PresetCard
                key={size.id}
                emoji={size.emoji}
                label={size.label}
                detail={`${size.flourWeightG}g flour${size.fatMultiplier > 0 ? " + ghee" : ""}`}
                selected={selectedFlatbreadId === size.id}
                onPress={() => setSelectedFlatbreadId(size.id)}
              />
            ))}
          {activeMode === "fat" &&
            FAT_UNITS.map((unit) => (
              <PresetCard
                key={unit.id}
                emoji={unit.emoji}
                label={unit.label}
                detail={`${unit.weightG}g`}
                selected={selectedFatId === unit.id}
                onPress={() => setSelectedFatId(unit.id)}
              />
            ))}
        </ScrollView>

        {/* Density picker note for katori mode */}
        {activeMode === "katori" && (
          <Text style={styles.densityNote}>
            Assumed consistency: {DENSITY_LABELS[densityCategory]}
          </Text>
        )}

        {/* Live preview */}
        {result && (
          <View style={styles.previewCard}>
            <Text style={styles.previewDescription}>{result.description}</Text>
            <View style={styles.previewMacroRow}>
              <MacroPreview label="Weight" value={`${result.weightG}g`} highlight />
              <MacroPreview label="Calories" value={`${result.macros.calories}`} highlight />
              <MacroPreview label="Protein" value={`${result.macros.protein_g}g`} />
              <MacroPreview label="Carbs" value={`${result.macros.carbs_g}g`} />
              <MacroPreview label="Fat" value={`${result.macros.fat_g}g`} />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmButton, !result && styles.confirmButtonDisabled]}
            disabled={!result}
          >
            <Text style={styles.confirmText}>Add to Meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PresetCard({
  emoji,
  label,
  detail,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.presetCard, selected && styles.presetCardSelected]}
      activeOpacity={0.75}
    >
      <Text style={styles.presetEmoji}>{emoji}</Text>
      <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.presetDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

function MacroPreview({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.macroPreviewCell}>
      <Text style={[styles.macroPreviewValue, highlight && styles.macroPreviewValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.macroPreviewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
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
    marginBottom: 16,
  },
  title: { color: colors.white, fontSize: 17, fontWeight: "700" },
  subtitle: { color: colors.slate400, fontSize: 12, marginTop: 2, marginBottom: 16 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  tabEmoji: { fontSize: 14 },
  tabLabel: { color: colors.slate400, fontSize: 12, fontWeight: "600" },
  tabLabelActive: { color: colors.white },
  presetRow: { gap: 10, paddingBottom: 4 },
  presetCard: {
    width: 108,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  presetCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  presetEmoji: { fontSize: 26, marginBottom: 6 },
  presetLabel: {
    color: colors.slate300,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  presetLabelSelected: { color: colors.white },
  presetDetail: { color: colors.slate500, fontSize: 10, textAlign: "center" },
  densityNote: { color: colors.slate500, fontSize: 11, marginTop: 10, fontStyle: "italic" },
  previewCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  previewDescription: { color: colors.slate300, fontSize: 12, marginBottom: 10 },
  previewMacroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroPreviewCell: { alignItems: "center", flex: 1 },
  macroPreviewValue: { color: colors.slate300, fontSize: 13, fontWeight: "700" },
  macroPreviewValueHighlight: { color: colors.primary, fontSize: 15 },
  macroPreviewLabel: { color: colors.slate500, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
  },
  cancelText: { color: colors.slate400, fontWeight: "600" },
  confirmButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmText: { color: colors.white, fontWeight: "700" },
});
