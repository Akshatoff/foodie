import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, CommonFood, FoodItem, MealAnalysis } from "@/types";
import { COMMON_FOODS } from "@/data/commonFoods";
import QuantityStepper from "@/components/QuantityStepper";
import HouseholdPortionSelector from "@/components/HouseholdPortionSelector";
import { buildQuickHouseholdItems, QuickHouseholdItem } from "@/utils/quickHouseholdItems";
import { PortionResult } from "@/utils/householdUnits";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ManualEntry">;

/**
 * A food picked by the user. For countable foods (food.unit is set, e.g.
 * "1 roti" = 40g) `quantity` drives `weightG` and the UI shows a stepper.
 * For everything else, `weightG` is edited directly as grams and
 * `quantity` is unused.
 */
interface SelectedItem {
  food: CommonFood;
  weightG: number;
  quantity: number;
}

function scaledMacros(food: CommonFood, weightG: number) {
  const factor = weightG / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein_g: Math.round(food.per100g.protein_g * factor),
    carbs_g: Math.round(food.per100g.carbs_g * factor),
    fat_g: Math.round(food.per100g.fat_g * factor),
  };
}

export default function ManualEntryScreen({ navigation, route }: Props) {
  const { imageUri } = route.params ?? {};
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  // Household unit quick-add: lets the user log common staples (dal, rice,
  // curd, roti/paratha, ghee/oil) by Katori/Roti/Spoon size instead of
  // typing grams. Backed by the IFCT staples + food database datasets
  // rather than duplicating macro numbers here.
  const quickItems = useMemo(() => buildQuickHouseholdItems(), []);
  const [activeQuickItem, setActiveQuickItem] = useState<QuickHouseholdItem | null>(null);

  function handleHouseholdConfirm(result: PortionResult) {
    if (!activeQuickItem) return;
    // Reverse-derive a per-100g figure so this slots into the existing
    // SelectedItem/CommonFood machinery unchanged - the household sheet
    // already computed the exact weight+macros for what was picked, we
    // just need to express it in the shape the rest of this screen expects.
    const per100gFactor = result.weightG > 0 ? 100 / result.weightG : 0;
    const syntheticFood: CommonFood = {
      id: `household_${activeQuickItem.id}_${Date.now()}`,
      name: `${activeQuickItem.label} (${result.description})`,
      per100g: {
        calories: Math.round(result.macros.calories * per100gFactor),
        protein_g: Math.round(result.macros.protein_g * per100gFactor * 10) / 10,
        carbs_g: Math.round(result.macros.carbs_g * per100gFactor * 10) / 10,
        fat_g: Math.round(result.macros.fat_g * per100gFactor * 10) / 10,
      },
    };
    setSelected((prev) => [...prev, { food: syntheticFood, quantity: 1, weightG: result.weightG }]);
    setActiveQuickItem(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMON_FOODS.slice(0, 8);
    return COMMON_FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  function addFood(food: CommonFood) {
    setSelected((prev) => {
      const existing = prev.find((s) => s.food.id === food.id);
      if (existing) {
        if (food.unit) {
          const nextQty = existing.quantity + 1;
          return prev.map((s) =>
            s.food.id === food.id
              ? { ...s, quantity: nextQty, weightG: nextQty * food.unit!.gramsPerUnit }
              : s
          );
        }
        return prev.map((s) =>
          s.food.id === food.id ? { ...s, weightG: s.weightG + 100 } : s
        );
      }
      if (food.unit) {
        return [...prev, { food, quantity: 1, weightG: food.unit.gramsPerUnit }];
      }
      return [...prev, { food, quantity: 1, weightG: 100 }];
    });
    setQuery("");
  }

  function updateQuantity(foodId: string, quantity: number) {
    setSelected((prev) =>
      prev.map((s) =>
        s.food.id === foodId && s.food.unit
          ? { ...s, quantity, weightG: quantity * s.food.unit.gramsPerUnit }
          : s
      )
    );
  }

  function updateWeight(foodId: string, weightG: number) {
    setSelected((prev) =>
      prev.map((s) =>
        s.food.id === foodId ? { ...s, weightG: Number.isFinite(weightG) ? weightG : 0 } : s
      )
    );
  }

  function removeItem(foodId: string) {
    setSelected((prev) => prev.filter((s) => s.food.id !== foodId));
  }

  function handleContinue() {
    const items: FoodItem[] = selected.map((s) => ({
      food_name: s.food.unit && s.quantity > 1 ? `${s.food.name} ×${s.quantity}` : s.food.name,
      estimated_weight_g: s.weightG,
      // Manual entries have no vision-based weight guess - the user typed
      // an exact weight (or picked an exact quantity), so min=max=best and
      // confidence is "high" by definition. This also means manual items
      // never trigger the low-confidence portion prompt on the Results
      // screen (see mealNeedsPortionConfirmation in portionEstimation.ts).
      estimated_weight_min_g: s.weightG,
      estimated_weight_max_g: s.weightG,
      best_guess_weight_g: s.weightG,
      weight_confidence_level: "high",
      confidence_explanation: "User-entered exact amount",
      macros: scaledMacros(s.food, s.weightG),
      confidence_score: 100, // user-entered, not estimated
      quantity: s.food.unit ? s.quantity : undefined,
    }));

    const totalCalories = items.reduce((sum, i) => sum + i.macros.calories, 0);

    const analysis: MealAnalysis = {
      meal_summary:
        items.length === 1 ? items[0].food_name : `${items[0]?.food_name ?? "Meal"} + ${items.length - 1} more`,
      total_calories: totalCalories,
      items,
      source: "manual",
    };

    navigation.replace("Results", { imageUri: imageUri ?? "", analysis });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Manually</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods (e.g. chicken, rice, banana)"
            placeholderTextColor={colors.slate500}
            style={styles.searchInput}
          />
        </View>

        {/* Household unit quick-add: Katori/Roti/Spoon instead of grams */}
        {quickItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChipRow}
          >
            {quickItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickChip}
                onPress={() => setActiveQuickItem(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickChipEmoji}>{item.emoji}</Text>
                <Text style={styles.quickChipLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Search results */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.searchList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => addFood(item)} style={styles.searchRow}>
              <Text style={styles.searchRowName}>{item.name}</Text>
              <Text style={styles.searchRowCalories}>
                {item.unit
                  ? `${Math.round((item.per100g.calories * item.unit.gramsPerUnit) / 100)} kcal/${item.unit.label}`
                  : `${item.per100g.calories} kcal/100g`}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.noMatches}>No matches. Try another term.</Text>}
        />

        {/* Selected items */}
        <View style={styles.selectedWrap}>
          <Text style={styles.sectionTitle}>Meal Items ({selected.length})</Text>
          {selected.length === 0 ? (
            <Text style={styles.emptyHint}>
              Search above and tap a food to add it to this meal. Tap it
              again (or use +/−) to bump up countable foods like roti or eggs.
            </Text>
          ) : (
            <FlatList
              data={selected}
              keyExtractor={(item) => item.food.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const macros = scaledMacros(item.food, item.weightG);
                return (
                  <View style={styles.selectedCard}>
                    <View style={styles.selectedHeaderRow}>
                      <Text style={styles.selectedName}>{item.food.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeItem(item.food.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.removeX}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.selectedFooterRow}>
                      {item.food.unit ? (
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(next) => updateQuantity(item.food.id, next)}
                          unitLabel={item.food.unit.label}
                        />
                      ) : (
                        <View style={styles.weightInputWrap}>
                          <TextInput
                            value={String(item.weightG)}
                            onChangeText={(t) => updateWeight(item.food.id, parseInt(t, 10) || 0)}
                            keyboardType="number-pad"
                            style={styles.weightInput}
                          />
                          <Text style={styles.gramsLabel}>grams</Text>
                        </View>
                      )}
                      <Text style={styles.itemCalories}>{macros.calories} kcal</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={selected.length === 0}
            style={[styles.continueButton, selected.length === 0 && styles.continueButtonDisabled]}
          >
            <Text
              style={[
                styles.continueButtonText,
                selected.length === 0 && styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {activeQuickItem && (
        <HouseholdPortionSelector
          visible={!!activeQuickItem}
          onDismiss={() => setActiveQuickItem(null)}
          onConfirm={handleHouseholdConfirm}
          foodName={activeQuickItem.label}
          availableModes={activeQuickItem.modes}
          foodMacrosPer100g={activeQuickItem.foodMacrosPer100g}
          densityCategory={activeQuickItem.densityCategory}
          flourMacrosPer100g={activeQuickItem.flourMacrosPer100g}
          fatMacrosPer100g={activeQuickItem.fatMacrosPer100g}
        />
      )}
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
  cancelText: { color: colors.slate400, fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "600", fontSize: 16 },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickChipRow: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  quickChipEmoji: { fontSize: 14 },
  quickChipLabel: { color: colors.slate300, fontSize: 12, fontWeight: "600" },
  searchList: { paddingHorizontal: 20, marginTop: 12, maxHeight: 220 },
  searchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  searchRowName: { color: colors.white },
  searchRowCalories: { color: colors.slate500, fontSize: 12 },
  noMatches: { color: colors.slate500, paddingVertical: 12 },
  selectedWrap: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { color: colors.white, fontWeight: "600", marginBottom: 8 },
  emptyHint: { color: colors.slate500 },
  selectedCard: { backgroundColor: colors.surfaceLight, borderRadius: 16, padding: 12, marginBottom: 8 },
  selectedHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectedName: { color: colors.white, fontWeight: "500", flex: 1, paddingRight: 8 },
  removeX: { color: colors.slate500, fontSize: 18, paddingHorizontal: 4 },
  selectedFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  weightInputWrap: { flexDirection: "row", alignItems: "center" },
  weightInput: {
    backgroundColor: colors.surface,
    color: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    width: 64,
    textAlign: "center",
  },
  gramsLabel: { color: colors.slate400, fontSize: 12, marginLeft: 8 },
  itemCalories: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  continueButtonDisabled: { backgroundColor: colors.surfaceLight },
  continueButtonText: { fontWeight: "600", color: colors.white },
  continueButtonTextDisabled: { color: colors.slate500 },
});
