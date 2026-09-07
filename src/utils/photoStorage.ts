import * as FileSystem from "expo-file-system";

const PENDING_PHOTOS_DIR = `${FileSystem.documentDirectory}pending-meals/`;

async function ensureDirExists(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PENDING_PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PENDING_PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Copies a captured photo out of expo-camera's cache location into this
 * app's own document directory. This matters specifically for the offline
 * queue: a photo left in the OS-managed cache can be silently deleted
 * under storage pressure well before the user reconnects to the internet
 * and the queue gets a chance to process it. Document directory storage
 * persists until the app itself removes it (or the app is uninstalled).
 *
 * Returns the new durable URI. Safe to call even when nothing is queued -
 * cheap, and callers should still clean up (deleteQueuedPhoto) once an
 * entry is successfully processed or discarded, to avoid accumulating
 * disk usage indefinitely.
 */
export async function saveDurablePhoto(sourceUri: string): Promise<string> {
  await ensureDirExists();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const destUri = `${PENDING_PHOTOS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

/** Reads a durably-stored photo back as base64, for resending to Gemini. */
export async function readPhotoAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/** Removes a queued photo from durable storage once it's no longer needed
 * (analysis succeeded, or the user discarded the queue entry). */
export async function deleteQueuedPhoto(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup - a failure here shouldn't block the rest of the
    // queue processing flow.
  }
}
