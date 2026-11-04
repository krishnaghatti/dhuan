import type { LevelKey } from "../common/Level";

export interface TableRowData {
  id: string;
  name: string;
  path: string;
  aqi: number | null;
  level: LevelKey | null;
  dominantPollutant: string | null;
  /** Oldest -> newest AQI values for the inline sparkline, if available. */
  sparkline?: (number | null)[];
}

export type SortKey = "name" | "aqi";
export type SortDirection = "asc" | "desc";
