import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { useMealStore } from "@/store/mealStore";
import { useGoalsStore } from "@/store/goalsStore";
import { formatGrams } from "@/utils/format";
import { scaleFoodItem, unscaleFoodItem } from "@/utils/nutrition";
import {
  mealNeedsOilEstimation,
  applyOilToAnalysis,
  OIL_OPTIONS,
  OilOption,
  OilOptionId,
} from "@/utils/oilEstimation";
import TagSelector from "@/components/TagSelector";
import WaterIntakeCard from "@/components/WaterIntakeCard";
import QuantityStepper from "@/components/QuantityStepper";
import OilEstimationSheet from "@/components/OilEstimationSheet";
import WeightRangeSlider, { scaledMacros } from "@/components/WeightRangeSlider";
import CorrectionToggle from "@/components/CorrectionToggle";
import PortionConfirmSheet from "@/components/PortionConfirmSheet";
import {
  getLowConfidenceIndices,
  PortionPreset,
} from "@/utils/portionEstimation";
import { useCorrectionStore, CorrectionPresetKey } from "@/store/correctionStore";
import {
  resolveMultiplier,
  applyCorrectAnalysis,
} from "@/utils/correctionFactor";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export default function ResultsScreen({ navigation, route }: Props) {
  const { imageUri, analysis, mealId } = route.params;
  const isEditMode = !!mealId;

  const addMeal = useMealStore((s) => s.addMeal);
  const updateMeal = useMealStore((s) => s.updateMeal);
  const removeMeal = useMealStore((s) => s.removeMeal);
  const savedMeal = useMealStore((s) =>
    mealId ? s.meals.find((m) => m.id === mealId) : undefined
  );
  const todaysTotals = useMealStore((s) => s.getTodaysTotals());
  const weightKg = useGoalsStore((s) => s.weightKg);

  // In edit mode, pre-fill tags from the saved meal instead of starting blank.
  const [tags, setTags] = useState<string[]>(() => savedMeal?.tags ?? []);

  // Oil estimation sheet state. Only shown when the meal contains oil/curry
  // keywords and only on the first save (not when reopening to edit quantity).
  const [oilSheetVisible, setOilSheetVisible] = useState(false);
  const [selectedOilId, setSelectedOilId] = useState<OilOptionId>("none");
  const [appliedOilOption, setAppliedOilOption] = useState<OilOption>(OIL_OPTIONS[0]);

  // Correction factor state
  const correctionEnabled = useCorrectionStore((s) => s.enabled);
  const correctionFactors = useCorrectionStore((s) => s.factors);
  const setCorrectionEnabled = useCorrectionStore((s) => s.setEnabled);
  const [activePreset, setActivePreset] = useState<CorrectionPresetKey | null>(null);
  const multiplier = resolveMultiplier(correctionFactors, correctionEnabled, activePreset);

  // Reconstruct per-unit baseline items so reopening a saved "Roti ×2" and
  // nudging the stepper doesn't compound on top of the already-doubled
  // weight/macros - scaleFoodItem always multiplies from this baseline.
  const baseItems = useMemo(
    () => analysis.items.map((item) => unscaleFoodItem(item)),
    [analysis.items]
  );

  // Quantities start at whatever was actually saved (or 1 for a fresh
  // AI/manual analysis that hasn't been saved yet).
  const [quantities, setQuantities] = useState<number[]>(() =>
    analysis.items.map((item) => Math.max(1, item.quantity ?? 1))
  );

  // Per-item weight overrides driven by the range slider. Initialised to
  // best_guess_weight_g (or estimated_weight_g as fallback for items that
  // came through before the weight-range schema was added).
  const [sliderWeights, setSliderWeights] = useState<number[]>(() =>
    analysis.items.map((item) => item.best_guess_weight_g ?? item.estimated_weight_g)
  );

  function setSliderWeight(idx: number, weight: number) {
    setSliderWeights((prev) => prev.map((w, i) => (i === idx ? weight : w)));
  }

  // Low-confidence portion clarification. Triggers once, on a fresh
  // (non-edit-mode) AI analysis, for every item flagged weight_confidence_
  // level === "low" - queued so multiple uncertain items are confirmed one
  // at a time rather than all at once. Skipped entirely in edit mode
  // (adjusting an already-saved meal) and for manual entries / oil items,
  // which are always "high" confidence by construction.
  const [portionQueue, setPortionQueue] = useState<number[]>([]);
  const [portionQueuePos, setPortionQueuePos] = useState(0);

  useEffect(() => {
    if (isEditMode) return;
    const lowConfidenceIndices = getLowConfidenceIndices(analysis.items);
    if (lowConfidenceIndices.length > 0) {
      setPortionQueue(lowConfidenceIndices);
      setPortionQueuePos(0);
    }
    // Only run once when the screen first receives its analysis - not on
    // every re-render as sliderWeights/quantities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portionSheetVisible = portionQueuePos < portionQueue.length;
  const currentPortionItemIdx = portionQueue[portionQueuePos];
  const currentPortionItem = currentPortionItemIdx != null ? baseItems[currentPortionItemIdx] : null;

  function handlePortionPick(_preset: PortionPreset, weight: number) {
    if (currentPortionItemIdx != null) {
      setSliderWeight(currentPortionItemIdx, weight);
    }
    // Single tap both picks AND advances - "confirm in a single tap".
    setPortionQueuePos((p) => p + 1);
  }

  const adjustedItems = useMemo(
    () =>
      baseItems.map((item, idx) => {
        // Step 1: apply the slider's weight override to the base item's macros.
        // The slider moves within [min,max] and rescales macros from best_guess.
        const sliderWeight = sliderWeights[idx] ?? item.estimated_weight_g;
        const sliderScaled = {
          ...item,
          estimated_weight_g: sliderWeight,
          best_guess_weight_g: sliderWeight,
          macros: scaledMacros(item, sliderWeight),
        };
        // Step 2: quantity stepper multiplies the slider-adjusted item.
        return scaleFoodItem(sliderScaled, quantities[idx] ?? 1);
      }),
    [baseItems, sliderWeights, quantities]
  );

  const adjustedTotalCalories = useMemo(
    () => adjustedItems.reduce((sum, i) => sum + i.macros.calories, 0),
    [adjustedItems]
  );

  function setQuantity(idx: number, next: number) {
    setQuantities((prev) => prev.map((q, i) => (i === idx ? next : q)));
  }

  function handleSave() {
    // In edit mode, skip the oil prompt - user is adjusting quantity on
    // something already saved, not logging a fresh meal.
    if (isEditMode && mealId) {
      commitSave(appliedOilOption);
      return;
    }
    // Show oil prompt when the meal looks like it has cooking oil/sauce.
    if (mealNeedsOilEstimation({ ...analysis, items: adjustedItems })) {
      setOilSheetVisible(true);
      return;
    }
    commitSave(OIL_OPTIONS[0]); // "none" - no oil adjustment
  }

  function handleOilConfirm() {
    const option = OIL_OPTIONS.find((o) => o.id === selectedOilId) ?? OIL_OPTIONS[0];
    setAppliedOilOption(option);
    setOilSheetVisible(false);
    commitSave(option);
  }

  function handleOilSkip() {
    setOilSheetVisible(false);
    commitSave(OIL_OPTIONS[0]); // treat skip as "none"
  }

  function commitSave(oilOption: OilOption) {
    const baseAnalysis = { ...analysis, items: adjustedItems, total_calories: adjustedTotalCalories };
    const afterOil = applyOilToAnalysis(baseAnalysis, oilOption);
    // Correction multiplier applied last so it stacks correctly on top of
    // both the slider-adjusted weights and the oil adjustment.
    const finalAnalysis = applyCorrectAnalysis(afterOil, multiplier);

    if (isEditMode && mealId) {
      updateMeal(mealId, {
        items: finalAnalysis.items,
        total_calories: finalAnalysis.total_calories,
        tags,
      });
      navigation.goBack();
      return;
    }
    addMeal(imageUri, finalAnalysis, tags);
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }

  function handleRetake() {
    if (analysis.source === "manual") {
      navigation.replace("ManualEntry", { imageUri });
    } else {
      navigation.replace("Camera");
    }
  }

  function handleDelete() {
    if (!mealId) return;
    Alert.alert("Delete meal?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeMeal(mealId);
          navigation.goBack();
        },
      },
    ]);
  }

  // Running total including this meal's current (possibly unsaved) numbers,
  // for the water estimate. In edit mode, subtract out the meal's original
  // saved calories first so we don't double-count it against today's total.
  const baselineCaloriesToday = isEditMode
    ? todaysTotals.calories - (savedMeal?.total_calories ?? 0)
    : todaysTotals.calories;
  const projectedCaloriesToday = baselineCaloriesToday + adjustedTotalCalories;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>No photo — entered manually</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.mealTitle}>{analysis.meal_summary}</Text>
            {analysis.source === "manual" && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>Manual</Text>
              </View>
            )}
          </View>

          {isEditMode && (
            <Text style={styles.editHint}>Editing a saved meal</Text>
          )}

          <View style={styles.caloriesRow}>
            <Text style={styles.caloriesValue}>
              {Math.round(adjustedTotalCalories * multiplier)}
            </Text>
            <Text style={styles.caloriesLabel}>total calories</Text>
            {multiplier > 1.0 && (
              <View style={styles.correctedBadge}>
                <Text style={styles.correctedBadgeText}>
                  +{Math.round(adjustedTotalCalories * (multiplier - 1))} corrected
                </Text>
              </View>
            )}
          </View>

          {/* Correction factor toggle */}
          {!isEditMode && (
            <CorrectionToggle
              enabled={correctionEnabled}
              onToggleEnabled={setCorrectionEnabled}
              activePreset={activePreset}
              onSelectPreset={setActivePreset}
              factors={correctionFactors}
              extraCalories={Math.round(
                adjustedTotalCalories * (multiplier - 1)
              )}
            />
          )}

          {/* Tagging */}
          <Text style={styles.sectionTitle}>Tag this meal</Text>
          <View style={{ marginBottom: 24 }}>
            <TagSelector selected={tags} onChange={setTags} />
          </View>

          <Text style={styles.sectionTitle}>
            {analysis.source === "manual" ? "Items" : "Detected Items"} (
            {adjustedItems.length})
          </Text>
          {analysis.items.length > 0 && (
            <Text style={styles.quantityHint}>
              Ate more than one of something? Use the +/− to adjust instead
              of retaking the photo.
            </Text>
          )}

          {adjustedItems.length === 0 ? (
            <Text style={styles.emptyItemsText}>
              No individual items were detected in this photo.
            </Text>
          ) : (
            adjustedItems.map((item, idx) => (
              <View key={`${item.food_name}-${idx}`} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemName}>{item.food_name}</Text>
                  <Text style={styles.itemWeight}>
                    {formatGrams(item.estimated_weight_g)}
                  </Text>
                </View>

                <View style={styles.macroRow}>
                  <MacroCell label="Cal" value={item.macros.calories} />
                  <MacroCell label="Protein" value={item.macros.protein_g} unit="g" />
                  <MacroCell label="Carbs" value={item.macros.carbs_g} unit="g" />
                  <MacroCell label="Fat" value={item.macros.fat_g} unit="g" />
                </View>

                <View style={styles.itemFooterRow}>
                  <Text style={styles.confidenceText}>
                    Confidence: {item.confidence_score}%
                  </Text>
                  <QuantityStepper
                    value={quantities[idx] ?? 1}
                    onChange={(next) => setQuantity(idx, next)}
                  />
                </View>

                {/* Only show range slider for AI-analyzed items that have
                    a non-trivial range. Manual items and oil adjustments
                    always have min===max so we skip them. */}
                {item.estimated_weight_min_g != null &&
                  item.estimated_weight_max_g != null &&
                  item.estimated_weight_min_g < item.estimated_weight_max_g && (
                    <WeightRangeSlider
                      item={baseItems[idx]}
                      currentWeight={sliderWeights[idx] ?? item.estimated_weight_g}
                      onChange={(w) => setSliderWeight(idx, w)}
                    />
                  )}
              </View>
            ))
          )}

          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <WaterIntakeCard
              weightKg={weightKg}
              caloriesConsumedToday={projectedCaloriesToday}
            />
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          onPress={isEditMode ? handleDelete : handleRetake}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {isEditMode ? "Delete" : analysis.source === "manual" ? "Edit Items" : "Retake"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {isEditMode ? "Update Meal" : "Save Meal"}
          </Text>
        </TouchableOpacity>
      </View>

      <PortionConfirmSheet
        visible={portionSheetVisible}
        item={currentPortionItem}
        position={
          portionQueue.length > 1
            ? { current: portionQueuePos + 1, total: portionQueue.length }
            : undefined
        }
        onPick={handlePortionPick}
      />

      <OilEstimationSheet
        visible={oilSheetVisible}
        mealSummary={analysis.meal_summary}
        selected={selectedOilId}
        onSelect={(option) => setSelectedOilId(option.id)}
        onConfirm={handleOilConfirm}
        onDismiss={handleOilSkip}
      />
    </SafeAreaView>
  );
}

function MacroCell({
  label,
  value,
  unit = "",
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroCellValue}>
        {value}
        {unit}
      </Text>
      <Text style={styles.macroCellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  heroImage: { width: "100%", height: 288 },
  heroPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: { color: colors.slate500, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mealTitle: { color: colors.white, fontSize: 20, fontWeight: "bold", flex: 1, paddingRight: 12 },
  manualBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  manualBadgeText: { color: colors.slate400, fontSize: 11 },
  editHint: { color: colors.primary, fontSize: 12, fontWeight: "600", marginTop: 6 },
  caloriesRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8, marginBottom: 20, flexWrap: "wrap", gap: 8 },
  caloriesValue: { color: colors.primary, fontSize: 30, fontWeight: "800" },
  caloriesLabel: { color: colors.slate400, marginLeft: 8 },
  correctedBadge: {
    backgroundColor: colors.primary + "22",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  correctedBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: colors.white, fontWeight: "600", marginBottom: 4 },
  quantityHint: { color: colors.slate500, fontSize: 11, marginBottom: 12 },
  emptyItemsText: { color: colors.slate500, marginBottom: 16 },
  itemCard: { backgroundColor: colors.surfaceLight, borderRadius: 16, padding: 16, marginBottom: 12 },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemName: { color: colors.white, fontWeight: "600", flex: 1, paddingRight: 12 },
  itemWeight: { color: colors.slate400, fontSize: 12 },
  macroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  macroCell: { alignItems: "center", flex: 1 },
  macroCellValue: { color: colors.white, fontWeight: "600", fontSize: 14 },
  macroCellLabel: { color: colors.slate500, fontSize: 10, marginTop: 2 },
  itemFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  confidenceText: { color: colors.slate500, fontSize: 11 },
  actionsBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.white, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.white, fontWeight: "600" },
});
