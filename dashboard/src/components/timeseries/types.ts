export interface TimeseriesPoint {
  /** ISO date (daily series) or ISO timestamp (recent30d series). */
  x: string;
  y: number | null;
}
