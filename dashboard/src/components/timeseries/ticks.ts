import type { TimeseriesPoint } from "./types";

export type SeriesMode = "daily" | "recent";

function formatTick(x: string, mode: SeriesMode): string {
  const date = new Date(x);
  if (Number.isNaN(date.getTime())) return x;
  return mode === "daily"
    ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Evenly-spaced axis tick positions across a series, labeled at month
 * granularity for full-history (daily) data and day granularity for the
 * last-30-days (recent) data -- the scale always matches whichever
 * resolution is currently selected. */
export function pickTicks(
  points: TimeseriesPoint[],
  mode: SeriesMode,
  maxTicks = 6,
): { index: number; label: string }[] {
  if (points.length === 0) return [];
  const count = Math.max(1, Math.min(maxTicks, points.length));
  const ticks: { index: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const index = count === 1 ? 0 : Math.round((i / (count - 1)) * (points.length - 1));
    ticks.push({ index, label: formatTick(points[index].x, mode) });
  }
  return ticks.filter((t, i) => i === 0 || t.index !== ticks[i - 1].index);
}
