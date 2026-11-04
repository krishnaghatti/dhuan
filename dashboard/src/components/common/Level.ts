/**
 * Single source of truth for the CPCB AQI severity scale: bucket boundaries,
 * labels, and colors. Must stay in lockstep with pipeline/aqi_calc.py's
 * LEVELS list -- the pipeline computes `level` directly, so this module's
 * job is display only (color, label), not re-deriving the bucket from aqi.
 *
 * Color notes: validated with the dataviz skill's validate_palette.py
 * (OKLab CVD simulation, --pairs all since any two states/cells can be
 * adjacent). A 6-hue Good->Severe scale cannot fully clear the colorblind
 * floor -- confirmed empirically, not assumed -- because deuteranopia
 * collapses dark-green against dark-red/maroon regardless of hue tuning.
 * Mitigation (non-negotiable, not polish): every place a level color is
 * used, the numeric AQI and the level label must also be visible. Color is
 * reinforcement only, never the sole channel.
 */

export type LevelKey = "good" | "satisfactory" | "moderate" | "poor" | "very_poor" | "severe";

export interface LevelInfo {
  key: LevelKey;
  label: string;
  maxAqi: number;
  color: string;
  colorDark: string;
}

export const LEVELS: LevelInfo[] = [
  { key: "good", label: "Good", maxAqi: 50, color: "#1A9850", colorDark: "#007a34" },
  { key: "satisfactory", label: "Satisfactory", maxAqi: 100, color: "#66BD63", colorDark: "#318a31" },
  { key: "moderate", label: "Moderate", maxAqi: 200, color: "#D99A1A", colorDark: "#b57800" },
  { key: "poor", label: "Poor", maxAqi: 300, color: "#E8601C", colorDark: "#d54e00" },
  { key: "very_poor", label: "Very Poor", maxAqi: 400, color: "#C21807", colorDark: "#c92313" },
  { key: "severe", label: "Severe", maxAqi: 500, color: "#9C1030", colorDark: "#af283f" },
];

const BY_KEY: Record<LevelKey, LevelInfo> = Object.fromEntries(
  LEVELS.map((l) => [l.key, l]),
) as Record<LevelKey, LevelInfo>;

export const NO_DATA_COLOR = { color: "#c9c8c2", colorDark: "#4a4a47" };

/** Look up display info by the level key the pipeline already computed. */
export function levelInfo(key: LevelKey | null | undefined): LevelInfo | null {
  if (!key) return null;
  return BY_KEY[key] ?? null;
}

/** Fallback bucketing from a raw AQI number, for any client-side-only value. */
export function levelForAqi(aqi: number | null | undefined): LevelInfo | null {
  if (aqi === null || aqi === undefined) return null;
  return LEVELS.find((l) => aqi <= l.maxAqi) ?? LEVELS[LEVELS.length - 1];
}

export function levelColor(key: LevelKey | null | undefined, dark = false): string {
  const info = levelInfo(key);
  if (!info) return dark ? NO_DATA_COLOR.colorDark : NO_DATA_COLOR.color;
  return dark ? info.colorDark : info.color;
}
