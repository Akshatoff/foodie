import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useTagsStore } from "@/store/tagsStore";
import { colors } from "@/theme/colors";

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ selected, onChange }: TagSelectorProps) {
  const allTags = useTagsStore((s) => s.getAllTags());
  const addCustomTag = useTagsStore((s) => s.addCustomTag);
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  function commitNewTag() {
    const trimmed = newTag.trim();
    if (trimmed) {
      addCustomTag(trimmed);
      onChange([...selected, trimmed]);
    }
    setNewTag("");
    setAdding(false);
  }

  return (
    <View style={styles.wrap}>
      {allTags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <TouchableOpacity
            key={tag}
            onPress={() => toggle(tag)}
            style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
          >
            <Text style={isSelected ? styles.chipTextSelected : styles.chipText}>
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}

      {!adding ? (
        <TouchableOpacity onPress={() => setAdding(true)} style={styles.addChip}>
          <Text style={styles.addChipText}>+ New tag</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.inputChip}>
          <TextInput
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Tag name"
            placeholderTextColor={colors.slate500}
            autoFocus
            onSubmitEditing={commitNewTag}
            returnKeyType="done"
            style={styles.textInput}
          />
          <TouchableOpacity onPress={commitNewTag} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={styles.addLabel}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipUnselected: { backgroundColor: "transparent", borderColor: colors.surfaceLight },
  chipText: { color: colors.slate400, fontSize: 14 },
  chipTextSelected: { color: colors.white, fontWeight: "600", fontSize: 14 },
  addChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate500,
  },
  addChipText: { color: colors.slate400, fontSize: 14 },
  inputChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 6,
  },
  textInput: { color: colors.white, fontSize: 14, paddingVertical: 6, width: 110 },
  addLabel: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
