export function round(n: number): number {
  return Math.round(n);
}

export function formatGrams(n: number): string {
  return `${round(n)}g`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
