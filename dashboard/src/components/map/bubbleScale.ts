import { LEVELS } from "../common/Level";

/** CPCB's Severe ceiling (500) -- the fixed top of the scale bubbles are
 * sized against, so a given AQI value reads as the same radius whether it's
 * shown at country zoom or state zoom. */
const MAX_AQI = LEVELS[LEVELS.length - 1].maxAqi;

/** Sqrt scale so *circle area* (not radius) is proportional to AQI --
 * standard proportional-symbol practice, since radius-linear bubbles make
 * high values look exaggerated. `null` (no data) gets the floor radius. */
export function bubbleRadius(aqi: number | null, minR: number, maxR: number): number {
  if (aqi === null) return minR;
  const clamped = Math.max(0, Math.min(MAX_AQI, aqi));
  const t = Math.sqrt(clamped / MAX_AQI);
  return minR + t * (maxR - minR);
}
