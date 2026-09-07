import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTagsStore } from "@/store/tagsStore";
import { colors } from "@/theme/colors";

interface TagFilterBarProps {
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

export default function TagFilterBar({ selectedTag, onSelect }: TagFilterBarProps) {
  const allTags = useTagsStore((s) => s.getAllTags());

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={[styles.chip, selectedTag === null ? styles.chipSelected : styles.chipUnselected]}
      >
        <Text style={selectedTag === null ? styles.textSelected : styles.text}>All</Text>
      </TouchableOpacity>

      {allTags.map((tag) => {
        const isSelected = selectedTag === tag;
        return (
          <TouchableOpacity
            key={tag}
            onPress={() => onSelect(tag)}
            style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
          >
            <Text style={isSelected ? styles.textSelected : styles.text}>{tag}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingRight: 20, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  chipSelected: { backgroundColor: colors.primary },
  chipUnselected: { backgroundColor: colors.surfaceLight },
  text: { color: colors.slate400, fontSize: 14 },
  textSelected: { color: colors.white, fontWeight: "600", fontSize: 14 },
});
