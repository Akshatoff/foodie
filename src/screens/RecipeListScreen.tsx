import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { Recipe } from "@/types/recipes";
import { useRecipeStore } from "@/store/recipeStore";
import { computeRecipeTotals } from "@/utils/recipeCalculations";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeList">;

export default function RecipeListScreen({ navigation }: Props) {
  const recipes = useRecipeStore((s) => s.recipes);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Recipes</Text>
        <TouchableOpacity onPress={() => navigation.navigate("RecipeBuilder", {})}>
          <Text style={styles.newText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Build a recipe once with exact ingredient weights, then log a
        portion of it anytime with exact-for-your-batch macros - no more
        guessing at a generic "dal" estimate.
      </Text>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptyBody}>
              Cook the same dal, curry, or dish often? Build it once as a
              recipe for accurate logging every time after.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("RecipeBuilder", {})}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>Create your first recipe</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <RecipeRow recipe={item} navigation={navigation} />}
      />
    </SafeAreaView>
  );
}

function RecipeRow({
  recipe,
  navigation,
}: {
  recipe: Recipe;
  navigation: Props["navigation"];
}) {
  const totals = useMemo(() => computeRecipeTotals(recipe), [recipe]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("RecipeBuilder", { recipeId: recipe.id })}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{recipe.name}</Text>
        <Text style={styles.cardSubtitle}>
          {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"} ·{" "}
          {recipe.servings} servings · {totals.totalCookedWeightG}g batch
        </Text>
        <Text style={styles.cardMacros}>
          {totals.macrosPerServing.calories} kcal/serving · {totals.macrosPerServing.protein_g}g
          protein
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
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
  newText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  subtitle: {
    color: colors.slate400,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: colors.white, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  cardSubtitle: { color: colors.slate400, fontSize: 12, marginBottom: 4 },
  cardMacros: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  chevron: { color: colors.slate500, fontSize: 22, marginLeft: 8 },
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: colors.white, fontWeight: "700", fontSize: 16, marginBottom: 8 },
  emptyBody: {
    color: colors.slate400,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyCtaText: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
