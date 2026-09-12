import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { Recipe } from "@/types/recipes";
import { computeRecipeTotals, macrosForRecipePortion } from "@/utils/recipeCalculations";
import { colors } from "@/theme/colors";

interface RecipePortionSheetProps {
  visible: boolean;
  recipe: Recipe | null;
  onDismiss: () => void;
  onConfirm: (weightG: number) => void;
}

type PortionMode = "serving" | "grams";

export default function RecipePortionSheet({
  visible,
  recipe,
  onDismiss,
  onConfirm,
}: RecipePortionSheetProps) {
  const [mode, setMode] = useState<PortionMode>("serving");
  const [servingCount, setServingCount] = useState("1");
  const [gramsInput, setGramsInput] = useState("200");

  const totals = useMemo(() => (recipe ? computeRecipeTotals(recipe) : null), [recipe]);

  const portionWeightG = useMemo(() => {
    if (!totals) return 0;
    if (mode === "serving") {
      const count = parseFloat(servingCount) || 0;
      return Math.round(totals.weightPerServingG * count);
    }
    return parseInt(gramsInput, 10) || 0;
  }, [mode, servingCount, gramsInput, totals]);

  const previewMacros = useMemo(
    () => (recipe ? macrosForRecipePortion(recipe, portionWeightG) : null),
    [recipe, portionWeightG]
  );

  if (!recipe || !totals) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>How much {recipe.name}?</Text>
        <Text style={styles.subtitle}>
          Exact-for-this-batch macros - not a generic estimate.
        </Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === "serving" && styles.modeTabActive]}
            onPress={() => setMode("serving")}
          >
            <Text style={[styles.modeTabText, mode === "serving" && styles.modeTabTextActive]}>
              Servings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === "grams" && styles.modeTabActive]}
            onPress={() => setMode("grams")}
          >
            <Text style={[styles.modeTabText, mode === "grams" && styles.modeTabTextActive]}>
              Exact Grams
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "serving" ? (
          <View style={styles.inputRow}>
            <TextInput
              value={servingCount}
              onChangeText={setServingCount}
              keyboardType="decimal-pad"
              style={styles.numberInput}
            />
            <Text style={styles.inputSuffix}>
              serving{parseFloat(servingCount) === 1 ? "" : "s"} (≈{totals.weightPerServingG}g each)
            </Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={gramsInput}
              onChangeText={setGramsInput}
              keyboardType="number-pad"
              style={styles.numberInput}
            />
            <Text style={styles.inputSuffix}>grams (weigh it for best accuracy)</Text>
          </View>
        )}

        {previewMacros && (
          <View style={styles.previewCard}>
            <Text style={styles.previewWeight}>{portionWeightG}g</Text>
            <View style={styles.previewMacroRow}>
              <PreviewStat label="Cal" value={previewMacros.calories} />
              <PreviewStat label="Protein" value={previewMacros.protein_g} unit="g" />
              <PreviewStat label="Carbs" value={previewMacros.carbs_g} unit="g" />
              <PreviewStat label="Fat" value={previewMacros.fat_g} unit="g" />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onConfirm(portionWeightG)}
            style={[styles.confirmButton, portionWeightG <= 0 && styles.confirmButtonDisabled]}
            disabled={portionWeightG <= 0}
          >
            <Text style={styles.confirmText}>Add to Meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PreviewStat({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.previewStatValue}>
        {value}
        {unit}
      </Text>
      <Text style={styles.previewStatLabel}>{label}</Text>
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
  modeRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  modeTabActive: { backgroundColor: colors.primary },
  modeTabText: { color: colors.slate400, fontSize: 13, fontWeight: "600" },
  modeTabTextActive: { color: colors.white },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  numberInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    width: 80,
    textAlign: "center",
  },
  inputSuffix: { color: colors.slate400, fontSize: 12, flex: 1 },
  previewCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  previewWeight: { color: colors.white, fontWeight: "700", fontSize: 20, marginBottom: 10 },
  previewMacroRow: { flexDirection: "row", width: "100%" },
  previewStatValue: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  previewStatLabel: { color: colors.slate500, fontSize: 10, marginTop: 2 },
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
