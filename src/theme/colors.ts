/**
 * Central color palette. Previously these lived in tailwind.config.js and
 * were referenced via NativeWind className strings (bg-primary, text-slate-400,
 * etc). NativeWind v2 turned out to be unreliable on Expo SDK 51 / RN 0.74 -
 * classNames were silently not being transformed into styles, which is why
 * the UI looked completely unstyled. Everything now uses plain StyleSheet
 * objects that import from here instead, so there's no build-time class
 * transform in the loop at all.
 */
export const colors = {
  primary: "#22C55E",
  primaryDark: "#16A34A",
  surface: "#0F172A",
  surfaceLight: "#1E293B",
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.4)",
  white: "#FFFFFF",
  black: "#000000",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  blue: "#38BDF8",
  yellow: "#FACC15",
  orange: "#F97316",
};
