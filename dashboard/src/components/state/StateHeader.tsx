import { Link } from "react-router-dom";
import { StatCard } from "../common/StatCard";
import type { LevelKey } from "../common/Level";
import "./StateHeader.scss";

interface StateHeaderProps {
  name: string;
  aqi: number | null;
  level: LevelKey | null;
  dominantPollutant: string | null;
}

export function StateHeader({ name, aqi, level, dominantPollutant }: StateHeaderProps) {
  return (
    <div className="state-header">
      <Link to="/" className="state-header__breadcrumb">
        ← All states
      </Link>
      <div className="state-header__row">
        <h1>{name}</h1>
        <StatCard label="State AQI" aqi={aqi} level={level} sublabel={dominantPollutant ? `Dominant: ${dominantPollutant}` : undefined} />
      </div>
    </div>
  );
}
