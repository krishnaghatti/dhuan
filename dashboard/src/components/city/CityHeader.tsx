import { Link } from "react-router-dom";
import { StatCard } from "../common/StatCard";
import type { LevelKey } from "../common/Level";
import "./CityHeader.scss";

interface CityHeaderProps {
  cityName: string;
  stateName: string;
  stateId: string;
  aqi: number | null;
  level: LevelKey | null;
  dominantPollutant: string | null;
  stationCount: number;
}

export function CityHeader({ cityName, stateName, stateId, aqi, level, dominantPollutant, stationCount }: CityHeaderProps) {
  return (
    <div className="city-header">
      <Link to={`/state/${stateId}`} className="city-header__breadcrumb">
        ← {stateName}
      </Link>
      <div className="city-header__row">
        <h1>{cityName}</h1>
        <StatCard
          label="City AQI"
          aqi={aqi}
          level={level}
          sublabel={dominantPollutant ? `Dominant: ${dominantPollutant} · ${stationCount} stations` : `${stationCount} stations`}
        />
      </div>
    </div>
  );
}
