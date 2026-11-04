import type { LevelKey } from "../common/Level";
import { levelColor, levelInfo } from "../common/Level";

interface CellProps {
  aqi: number | null;
  level: LevelKey | null;
}

/** AQI cell: color swatch is reinforcement only -- the number and category
 * text are always rendered, per the accessibility mandate in Level.ts. */
export function Cell({ aqi, level }: CellProps) {
  const info = levelInfo(level);
  return (
    <span className="table-cell-aqi">
      <span className="table-cell-aqi__swatch" style={{ background: levelColor(level) }} aria-hidden="true" />
      <span className="table-cell-aqi__value">{aqi ?? "—"}</span>
      <span className="table-cell-aqi__label">{info?.label ?? "No data"}</span>
    </span>
  );
}
