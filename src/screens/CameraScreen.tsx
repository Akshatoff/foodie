import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import { analyzeMealImage } from "@/services/aiService";
import { saveDurablePhoto, readPhotoAsBase64 } from "@/utils/photoStorage";
import { usePendingQueueStore } from "@/store/pendingQueueStore";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

interface CapturedPhoto {
  /** Durable app-storage URI (survives OS cache clearing) - NOT the raw
   * camera cache URI expo-camera hands back. */
  uri: string;
}

export default function CameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>("back");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  // Kept around so "Retry" / "Enter Manually" / "Save for Later" don't
  // require retaking the photo.
  const [lastPhoto, setLastPhoto] = useState<CapturedPhoto | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const enqueue = usePendingQueueStore((s) => s.enqueue);

  const busy = isCapturing || isAnalyzing;

  // Live offline indicator so the user knows upfront (before even
  // capturing) that this photo will be queued rather than analyzed
  // immediately.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  // ---- Permission states ---------------------------------------------

  if (!permission) {
    // Permission status is still loading.
    return (
      <SafeAreaView style={styles.centeredBlack}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.centeredBlack, { paddingHorizontal: 32 }]}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          AI Food Tracker needs your camera to analyze meal photos. You can
          grant access below, or enable it later from your device Settings.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.grantButton}>
          <Text style={styles.grantButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.notNowText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("ManualEntry", {})}
          style={{ marginTop: 16 }}
        >
          <Text style={styles.manualLink}>Or log this meal manually instead</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ---- Capture -----------------------------------------------------------

  async function handleCapture() {
    if (!cameraRef.current || busy) return;
    setAnalyzeError(null);

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: true,
      });

      if (!photo?.base64 || !photo.uri) {
        setIsCapturing(false);
        setAnalyzeError("Couldn't capture that photo. Please try again.");
        return;
      }

      // Copy out of expo-camera's cache dir immediately - if this photo
      // ends up in the offline/failure queue, it needs to survive OS cache
      // clearing until the app gets a chance to process it, which could be
      // hours or days later.
      const durableUri = await saveDurablePhoto(photo.uri);
      setIsCapturing(false);

      const captured: CapturedPhoto = { uri: durableUri };
      setLastPhoto(captured);

      // Check connectivity BEFORE attempting analysis - no point making a
      // network call we already know will fail, and this avoids the
      // request-timeout error flash entirely for the common "I'm on the
      // subway with no signal" case.
      const net = await NetInfo.fetch();
      if (!net.isConnected || net.isInternetReachable === false) {
        handleQueueForLater(durableUri, "offline", undefined);
        return;
      }

      await runAnalysis(photo.base64, durableUri);
    } catch (err) {
      setIsCapturing(false);
      setIsAnalyzing(false);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setAnalyzeError(message);
      Alert.alert("Capture failed", message);
    }
  }

  // ---- Analyze (retryable without retaking the photo) ---------------------

  async function runAnalysis(base64: string, durableUri: string) {
    setAnalyzeError(null);
    setIsAnalyzing(true);
    const result = await analyzeMealImage(base64, "image/jpeg");
    setIsAnalyzing(false);

    if (!result.success) {
      setAnalyzeError(result.error);
      return;
    }

    navigation.navigate("Results", {
      imageUri: durableUri,
      analysis: result.data,
    });
  }

  function handleRetry() {
    // Re-derive base64 from the durable file rather than reusing whatever
    // we captured originally - retry after a failure may happen a while
    // later, and this keeps a single source of truth for "what we send."
    if (!lastPhoto) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    readPhotoAsBase64(lastPhoto.uri)
      .then((base64) => runAnalysis(base64, lastPhoto.uri))
      .catch(() => {
        setIsAnalyzing(false);
        setAnalyzeError("Couldn't read the saved photo. Please retake it.");
      });
  }

  function handleEnterManually() {
    navigation.navigate("ManualEntry", { imageUri: lastPhoto?.uri });
  }

  /**
   * Escape hatch for both the offline path and the "stuck in a Try Again
   * loop" path: instead of forcing the user to keep hitting a wall,
   * this saves the photo into the pending queue and takes them back to
   * Home. The queue processor will pick it up automatically once the
   * device is back online (or the transient failure clears).
   */
  function handleQueueForLater(uri: string, status: "offline" | "pending", error?: string) {
    enqueue(uri, { status, error });
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    // Slight delay so the reset navigation completes before the alert
    // renders on top of Home rather than the camera screen.
    setTimeout(() => {
      Alert.alert(
        status === "offline" ? "Saved - you're offline" : "Saved for later",
        status === "offline"
          ? "This meal will be analyzed automatically once you're back online."
          : "This meal will be retried automatically. You can check its status anytime from Home."
      );
    }, 300);
  }

  function handleSaveForLater() {
    if (!lastPhoto) return;
    handleQueueForLater(lastPhoto.uri, "pending", analyzeError ?? undefined);
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing={facing}>
        <SafeAreaView style={styles.overlaySafe}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={busy}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <View style={styles.hintPill}>
              <Text style={styles.hintText}>
                {isOffline ? "Offline - photo will be saved" : "Frame your meal, then capture"}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {isOffline && !busy && !analyzeError && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                📡 No connection - photos taken now will be analyzed automatically once you're back online.
              </Text>
            </View>
          )}

          {/* Error banner with recovery actions */}
          {analyzeError && !busy && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{analyzeError}</Text>
              <View style={styles.errorActions}>
                {lastPhoto && (
                  <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSaveForLater} style={styles.saveForLaterButton}>
                  <Text style={styles.saveForLaterButtonText}>Save for Later</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleEnterManually} style={{ marginTop: 10 }}>
                <Text style={styles.manualLinkOnDark}>Or enter this meal manually</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading overlay */}
          {busy && (
            <View style={styles.loadingWrap}>
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingTitle}>
                  {isCapturing ? "Capturing photo..." : "Analyzing meal..."}
                </Text>
                <Text style={styles.loadingSubtitle}>This can take a few seconds</Text>
              </View>
            </View>
          )}

          {/* Capture button */}
          {!busy && (
            <View style={styles.captureWrap}>
              <TouchableOpacity
                onPress={handleCapture}
                accessibilityLabel="Capture photo"
                style={styles.captureOuter}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
              {!analyzeError && (
                <TouchableOpacity onPress={handleEnterManually} style={{ marginTop: 20 }}>
                  <Text style={styles.skipLink}>Skip photo, log manually</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.black },
  centeredBlack: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  permissionBody: { color: colors.slate400, textAlign: "center", marginBottom: 24 },
  grantButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginBottom: 12,
  },
  grantButtonText: { color: colors.white, fontWeight: "600" },
  notNowText: { color: colors.slate400 },
  manualLink: { color: colors.slate500, fontSize: 13, textDecorationLine: "underline" },
  overlaySafe: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { color: colors.white, fontSize: 20 },
  hintPill: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  hintText: { color: colors.white, fontSize: 13 },
  offlineBanner: {
    marginHorizontal: 20,
    backgroundColor: "rgba(245, 158, 11, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  offlineBannerText: { color: colors.black, fontSize: 12, fontWeight: "600" },
  errorBanner: {
    marginHorizontal: 20,
    backgroundColor: "rgba(239, 68, 68, 0.92)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  errorText: { color: colors.white, fontSize: 14, marginBottom: 12 },
  errorActions: { flexDirection: "row", gap: 8 },
  retryButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  retryButtonText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  saveForLaterButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  saveForLaterButtonText: { color: colors.black, fontWeight: "600", fontSize: 13 },
  manualLinkOnDark: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  loadingWrap: { alignItems: "center", marginBottom: 32 },
  loadingCard: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingTitle: { color: colors.white, fontWeight: "500", marginTop: 12 },
  loadingSubtitle: { color: colors.slate400, fontSize: 12, marginTop: 4 },
  captureWrap: { alignItems: "center", paddingBottom: 40 },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
  },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white },
  skipLink: { color: "rgba(255,255,255,0.7)", fontSize: 13, textDecorationLine: "underline" },
});
