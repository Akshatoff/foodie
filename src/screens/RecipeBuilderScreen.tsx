import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import uuid from "react-native-uuid";
import { RootStackParamList } from "@/types";
import { RecipeIngredientRef } from "@/types/recipes";
import { useRecipeStore } from "@/store/recipeStore";
import {
  searchIngredients,
  computeRecipeTotals,
  IngredientSearchResult,
} from "@/utils/recipeCalculations";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeBuilder">;

export default function RecipeBuilderScreen({ navigation, route }: Props) {
  const { recipeId } = route.params ?? {};
  const isEditMode = !!recipeId;

  const existingRecipe = useRecipeStore((s) =>
    recipeId ? s.recipes.find((r) => r.id === recipeId) : undefined
  );
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const updateRecipe = useRecipeStore((s) => s.updateRecipe);
  const removeRecipe = useRecipeStore((s) => s.removeRecipe);

  const [name, setName] = useState(existingRecipe?.name ?? "");
  const [servings, setServings] = useState(String(existingRecipe?.servings ?? 4));
  const [ingredients, setIngredients] = useState<RecipeIngredientRef[]>(
    existingRecipe?.ingredients ?? []
  );
  const [query, setQuery] = useState("");

  const searchResults = useMemo(
    () => (query.trim().length > 0 ? searchIngredients(query, 10) : []),
    [query]
  );

  // Live totals recompute on every ingredient/weight/servings change - this
  // is the entire point of the feature: see the exact batch macros as you
  // build the recipe, not after saving.
  const previewRecipe = useMemo(
    () => ({
      id: recipeId ?? "preview",
      name,
      ingredients,
      servings: parseInt(servings, 10) || 1,
      createdAt: "",
      updatedAt: "",
    }),
    [recipeId, name, ingredients, servings]
  );
  const totals = useMemo(() => computeRecipeTotals(previewRecipe), [previewRecipe]);

  function handleAddIngredient(result: IngredientSearchResult) {
    const newRef: RecipeIngredientRef = {
      lineId: uuid.v4() as string,
      source: result.source,
      refId: result.refId,
      name: result.name,
      weightG: 100, // sensible default - user adjusts immediately below
    };
    setIngredients((prev) => [...prev, newRef]);
    setQuery("");
  }

  function updateIngredientWeight(lineId: string, weightG: number) {
    setIngredients((prev) =>
      prev.map((ing) => (ing.lineId === lineId ? { ...ing, weightG: Math.max(0, weightG) } : ing))
    );
  }

  function removeIngredient(lineId: string) {
    setIngredients((prev) => prev.filter((ing) => ing.lineId !== lineId));
  }

  function handleSave() {
    if (ingredients.length === 0) {
      Alert.alert("Add at least one ingredient", "A recipe needs at least one ingredient to compute macros from.");
      return;
    }
    const servingsNum = parseInt(servings, 10) || 1;
    if (isEditMode && recipeId) {
      updateRecipe(recipeId, { name, ingredients, servings: servingsNum });
    } else {
      addRecipe(name, ingredients, servingsNum);
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!recipeId) return;
    Alert.alert("Delete this recipe?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeRecipe(recipeId);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? "Edit Recipe" : "New Recipe"}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Recipe name (e.g. My Toor Dal)"
            placeholderTextColor={colors.slate500}
            style={styles.nameInput}
          />

          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Batch makes</Text>
            <TextInput
              value={servings}
              onChangeText={setServings}
              keyboardType="number-pad"
              style={styles.servingsInput}
            />
            <Text style={styles.servingsLabel}>servings</Text>
          </View>

          {/* Live totals preview - the payoff of the feature, always visible */}
          <View style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>
              Batch total: {totals.totalCookedWeightG}g cooked
            </Text>
            <View style={styles.totalsMacroRow}>
              <TotalStat label="Cal" value={totals.totalMacros.calories} />
              <TotalStat label="Protein" value={totals.totalMacros.protein_g} unit="g" />
              <TotalStat label="Carbs" value={totals.totalMacros.carbs_g} unit="g" />
              <TotalStat label="Fat" value={totals.totalMacros.fat_g} unit="g" />
            </View>
            <View style={styles.totalsDivider} />
            <Text style={styles.perServingText}>
              1 serving ≈ {totals.weightPerServingG}g · {totals.macrosPerServing.calories} kcal ·{" "}
              {totals.macrosPerServing.protein_g}g protein
            </Text>
          </View>

          {/* Ingredient search */}
          <Text style={styles.sectionTitle}>Add ingredients</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search (e.g. toor dal, ghee, chicken)"
            placeholderTextColor={colors.slate500}
            style={styles.searchInput}
          />
          {searchResults.length > 0 && (
            <View style={styles.searchResultsWrap}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={`${result.source}-${result.refId}`}
                  style={styles.searchResultRow}
                  onPress={() => handleAddIngredient(result)}
                >
                  <Text style={styles.searchResultName}>{result.name}</Text>
                  <View style={styles.searchResultBadge}>
                    <Text style={styles.searchResultBadgeText}>
                      {result.isRawBasis ? "IFCT" : "DB"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Ingredient list with editable weights */}
          <Text style={styles.sectionTitle}>
            Ingredients ({ingredients.length})
          </Text>
          {ingredients.length === 0 ? (
            <Text style={styles.emptyHint}>
              Search above and add each ingredient with its raw weight, just
              like the recipe you actually cook.
            </Text>
          ) : (
            ingredients.map((ing) => (
              <View key={ing.lineId} style={styles.ingredientRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientSourceLabel}>
                    {ing.source === "ifct" ? "raw weight" : "weight used"}
                  </Text>
                </View>
                <View style={styles.weightInputWrap}>
                  <TextInput
                    value={String(ing.weightG)}
                    onChangeText={(t) => updateIngredientWeight(ing.lineId, parseInt(t, 10) || 0)}
                    keyboardType="number-pad"
                    style={styles.weightInput}
                  />
                  <Text style={styles.gramsLabel}>g</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeIngredient(ing.lineId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeX}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {isEditMode && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete Recipe</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TotalStat({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.totalStatValue}>
        {value}
        {unit}
      </Text>
      <Text style={styles.totalStatLabel}>{label}</Text>
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
  cancelText: { color: colors.slate400, fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "600", fontSize: 16 },
  saveText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  nameInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  servingsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
  servingsLabel: { color: colors.slate400, fontSize: 13 },
  servingsInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 56,
    textAlign: "center",
  },
  totalsCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    marginBottom: 24,
  },
  totalsTitle: { color: colors.white, fontWeight: "700", fontSize: 14, marginBottom: 12 },
  totalsMacroRow: { flexDirection: "row" },
  totalStatValue: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  totalStatLabel: { color: colors.slate500, fontSize: 10, marginTop: 2 },
  totalsDivider: { height: 1, backgroundColor: colors.surface, marginVertical: 12 },
  perServingText: { color: colors.slate300, fontSize: 12 },
  sectionTitle: { color: colors.white, fontWeight: "600", marginBottom: 8 },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResultsWrap: { marginTop: 8, marginBottom: 8 },
  searchResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  searchResultName: { color: colors.white, fontSize: 14 },
  searchResultBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  searchResultBadgeText: { color: colors.slate400, fontSize: 9, fontWeight: "700" },
  emptyHint: { color: colors.slate500, fontSize: 13, marginBottom: 16 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  ingredientName: { color: colors.white, fontWeight: "500", fontSize: 13 },
  ingredientSourceLabel: { color: colors.slate500, fontSize: 10, marginTop: 2 },
  weightInputWrap: { flexDirection: "row", alignItems: "center" },
  weightInput: {
    backgroundColor: colors.surface,
    color: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: "center",
  },
  gramsLabel: { color: colors.slate400, fontSize: 12, marginLeft: 6 },
  removeX: { color: colors.slate500, fontSize: 20, paddingHorizontal: 2 },
  deleteButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
  },
  deleteButtonText: { color: colors.dangerMuted, fontWeight: "700" },
});
