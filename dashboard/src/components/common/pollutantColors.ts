/**
 * Per-pollutant identity colors for the small-multiples grid (distinct from
 * Level.ts's severity colors -- these encode "which pollutant", not "how
 * bad"). Uses the Okabe-Ito color-universal-design palette, a standard
 * colorblind-safe categorical set; safe here regardless because each swatch
 * is paired with a text label, never the sole channel.
 */
const PALETTE: Record<string, string> = {
  "PM2.5": "#E69F00",
  PM10: "#56B4E9",
  NO2: "#009E73",
  SO2: "#CC79A7",
  CO: "#0072B2",
  OZONE: "#D55E00",
  NH3: "#8A7F00",
};

const FALLBACK = "#6b6a63";

export function pollutantColor(pollutantId: string): string {
  return PALETTE[pollutantId] ?? FALLBACK;
}
