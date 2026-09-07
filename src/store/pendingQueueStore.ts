import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

export type PendingMealStatus =
  | "offline"     // captured with no connection - never attempted yet
  | "pending"     // has a transient failure, waiting to be retried
  | "processing"  // actively being analyzed right now
  | "failed";     // exceeded MAX_ATTEMPTS - needs manual action

export interface PendingMealEntry {
  id: string;
  /** Durable local file path (copied out of the camera's cache dir into
   * app document storage on capture - see photoStorage.ts - so it survives
   * app restarts and OS cache clearing, not just the current session). */
  imageUri: string;
  createdAt: string; // ISO
  status: PendingMealStatus;
  attemptCount: number;
  lastError?: string;
  /** Tags the user had already picked before the failure, if any -
   * preserved so a manual retry doesn't lose that context. */
  tags?: string[];
}

const MAX_ATTEMPTS = 5;

interface PendingQueueStore {
  entries: PendingMealEntry[];
  enqueue: (imageUri: string, opts?: { status?: PendingMealStatus; error?: string; tags?: string[] }) => string;
  markProcessing: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  remove: (id: string) => void;
  resetForRetry: (id: string) => void;
  /** Entries eligible for automatic background processing - excludes
   * "failed" (exceeded MAX_ATTEMPTS, needs a manual decision) and
   * "processing" (already in flight, avoid double-submitting). */
  getProcessableEntries: () => PendingMealEntry[];
}

export const usePendingQueueStore = create<PendingQueueStore>()(
  persist(
    (set, get) => ({
      entries: [],

      enqueue: (imageUri, opts) => {
        const id = uuid.v4() as string;
        const entry: PendingMealEntry = {
          id,
          imageUri,
          createdAt: new Date().toISOString(),
          status: opts?.status ?? "offline",
          attemptCount: 0,
          lastError: opts?.error,
          tags: opts?.tags,
        };
        set((state) => ({ entries: [entry, ...state.entries] }));
        return id;
      },

      markProcessing: (id) => {
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, status: "processing" } : e)),
        }));
      },

      markFailed: (id, error) => {
        set((state) => ({
          entries: state.entries.map((e) => {
            if (e.id !== id) return e;
            const attemptCount = e.attemptCount + 1;
            return {
              ...e,
              attemptCount,
              lastError: error,
              status: attemptCount >= MAX_ATTEMPTS ? "failed" : "pending",
            };
          }),
        }));
      },

      remove: (id) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      resetForRetry: (id) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, status: "pending", attemptCount: 0, lastError: undefined } : e
          ),
        }));
      },

      getProcessableEntries: () => {
        return get().entries.filter((e) => e.status === "offline" || e.status === "pending");
      },
    }),
    {
      name: "ai-food-tracker/pending-queue",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
