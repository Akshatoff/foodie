import NetInfo from "@react-native-community/netinfo";
import { usePendingQueueStore, PendingMealEntry } from "@/store/pendingQueueStore";
import { useMealStore } from "@/store/mealStore";
import { analyzeMealImage } from "@/services/aiService";
import { readPhotoAsBase64, deleteQueuedPhoto } from "@/utils/photoStorage";

// Module-level (not React state) guard against overlapping runs - this
// gets triggered from multiple places (connectivity listener, app launch,
// manual "Retry now" tap), and running the queue twice concurrently would
// double-submit the same photos to Gemini.
let isProcessing = false;

export function isQueueProcessing(): boolean {
  return isProcessing;
}

/**
 * Works through every processable entry in the pending queue (offline
 * captures + previously-failed-but-retryable items), analyzing each and
 * adding it to the meal log automatically on success - no user review
 * step, since this runs in the background with nobody necessarily looking
 * at the screen. Items keep their originally-picked tags if the failure
 * happened after tagging; otherwise they fall back to mealStore's default
 * ("Snacks").
 *
 * Stops early (without penalizing remaining entries' attempt counts) the
 * moment a network error is hit, since that almost always means the
 * device just went offline again mid-run and every other queued item will
 * fail identically.
 */
export async function processPendingQueue(): Promise<{ succeeded: number; failed: number }> {
  if (isProcessing) return { succeeded: 0, failed: 0 };

  const net = await NetInfo.fetch();
  if (!net.isConnected || net.isInternetReachable === false) {
    return { succeeded: 0, failed: 0 };
  }

  isProcessing = true;
  let succeeded = 0;
  let failed = 0;

  try {
    const queue = usePendingQueueStore.getState();
    const entries = queue.getProcessableEntries();

    for (const entry of entries) {
      const outcome = await processOne(entry);
      if (outcome === "succeeded") succeeded++;
      else if (outcome === "failed") failed++;
      else if (outcome === "offline") break; // device dropped connection mid-run
    }
  } finally {
    isProcessing = false;
  }

  return { succeeded, failed };
}

async function processOne(
  entry: PendingMealEntry
): Promise<"succeeded" | "failed" | "offline"> {
  const queue = usePendingQueueStore.getState();
  queue.markProcessing(entry.id);

  let base64: string;
  try {
    base64 = await readPhotoAsBase64(entry.imageUri);
  } catch {
    // The photo itself is gone (shouldn't normally happen with durable
    // storage, but disks can still fail) - no point retrying forever.
    queue.markFailed(entry.id, "Saved photo could not be read from storage.");
    return "failed";
  }

  const result = await analyzeMealImage(base64, "image/jpeg");

  if (result.success) {
    useMealStore.getState().addMeal(entry.imageUri, result.data, entry.tags ?? []);
    await deleteQueuedPhoto(entry.imageUri);
    queue.remove(entry.id);
    return "succeeded";
  }

  if (result.code === "NETWORK_ERROR") {
    // Not a real failed attempt - just offline again. Revert to "offline"
    // without incrementing attemptCount so it doesn't get penalized for
    // something that isn't the AI's fault.
    usePendingQueueStore.setState((state) => ({
      entries: state.entries.map((e) =>
        e.id === entry.id ? { ...e, status: "offline" as const } : e
      ),
    }));
    return "offline";
  }

  queue.markFailed(entry.id, result.error);
  return "failed";
}
