import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { usePendingQueueStore, PendingMealEntry } from "@/store/pendingQueueStore";
import { deleteQueuedPhoto } from "@/utils/photoStorage";
import { processPendingQueue } from "@/services/queueProcessor";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "PendingQueue">;

const STATUS_META: Record<
  PendingMealEntry["status"],
  { label: string; color: string }
> = {
  offline: { label: "Waiting for connection", color: colors.slate400 },
  pending: { label: "Waiting to retry", color: "#f59e0b" },
  processing: { label: "Analyzing now...", color: colors.primary },
  failed: { label: "Needs attention", color: colors.dangerMuted },
};

export default function PendingQueueScreen({ navigation }: Props) {
  const entries = usePendingQueueStore((s) => s.entries);
  const remove = usePendingQueueStore((s) => s.remove);
  const resetForRetry = usePendingQueueStore((s) => s.resetForRetry);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  async function handleRetryAll() {
    setIsRetryingAll(true);
    const { succeeded, failed } = await processPendingQueue();
    setIsRetryingAll(false);
    Alert.alert(
      "Queue processed",
      succeeded > 0 || failed > 0
        ? `${succeeded} meal${succeeded === 1 ? "" : "s"} added. ${
            failed > 0 ? `${failed} still need attention.` : ""
          }`
        : "Nothing to process right now - check your connection."
    );
  }

  function handleRetryOne(entry: PendingMealEntry) {
    resetForRetry(entry.id);
    processPendingQueue();
  }

  function handleDelete(entry: PendingMealEntry) {
    Alert.alert("Discard this meal?", "The photo will be deleted and this won't be logged.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          await deleteQueuedPhoto(entry.imageUri);
          remove(entry.id);
        },
      },
    ]);
  }

  function handleEnterManually(entry: PendingMealEntry) {
    remove(entry.id); // it'll be logged via manual entry instead
    navigation.navigate("ManualEntry", { imageUri: entry.imageUri });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Meals</Text>
        <View style={{ width: 40 }} />
      </View>

      {entries.length > 0 && (
        <TouchableOpacity
          onPress={handleRetryAll}
          disabled={isRetryingAll}
          style={styles.retryAllButton}
        >
          {isRetryingAll ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.retryAllText}>Retry All Now</Text>
          )}
        </TouchableOpacity>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Nothing pending</Text>
            <Text style={styles.emptyBody}>
              Photos taken while offline, or that fail to analyze, will show
              up here and get retried automatically.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <View style={styles.card}>
              <Image source={{ uri: item.imageUri }} style={styles.thumb} />
              <View style={styles.cardMiddle}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                {item.lastError && item.status === "failed" && (
                  <Text style={styles.errorText} numberOfLines={2}>
                    {item.lastError}
                  </Text>
                )}
                {item.attemptCount > 0 && (
                  <Text style={styles.attemptText}>
                    {item.attemptCount} attempt{item.attemptCount === 1 ? "" : "s"} so far
                  </Text>
                )}
              </View>
              <View style={styles.cardActions}>
                {item.status !== "processing" && (
                  <TouchableOpacity onPress={() => handleRetryOne(item)} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Retry</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleEnterManually(item)}
                  style={styles.actionButtonSecondary}
                >
                  <Text style={styles.actionButtonSecondaryText}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteText}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
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
  retryAllButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  retryAllText: { color: colors.white, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  cardMiddle: { flex: 1, justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  timeText: { color: colors.slate500, fontSize: 11 },
  errorText: { color: colors.dangerMuted, fontSize: 11, marginTop: 4 },
  attemptText: { color: colors.slate600, fontSize: 10, marginTop: 2 },
  cardActions: { justifyContent: "space-between", alignItems: "flex-end", gap: 6 },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonSecondaryText: { color: colors.slate300, fontSize: 11, fontWeight: "600" },
  deleteText: { color: colors.slate500, fontSize: 11, textDecorationLine: "underline" },
  emptyWrap: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: colors.white, fontWeight: "700", fontSize: 16, marginBottom: 8 },
  emptyBody: { color: colors.slate400, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
