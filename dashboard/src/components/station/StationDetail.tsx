import { Link } from "react-router-dom";
import { StatCard } from "../common/StatCard";
import type { LevelKey } from "../common/Level";
import "./StationDetail.scss";

interface StationDetailProps {
  stationName: string;
  cityName: string;
  stateId: string;
  cityId: string;
  lat: number | null;
  lon: number | null;
  aqi: number | null;
  level: LevelKey | null;
  dominantPollutant: string | null;
}

export function StationDetail({
  stationName,
  cityName,
  stateId,
  cityId,
  lat,
  lon,
  aqi,
  level,
  dominantPollutant,
}: StationDetailProps) {
  return (
    <div className="station-detail">
      <Link to={`/state/${stateId}/${cityId}`} className="station-detail__breadcrumb">
        ← {cityName}
      </Link>
      <div className="station-detail__row">
        <div>
          <h1>{stationName}</h1>
          {lat !== null && lon !== null && (
            <p className="station-detail__coords">
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </p>
          )}
        </div>
        <StatCard label="Station AQI" aqi={aqi} level={level} sublabel={dominantPollutant ? `Dominant: ${dominantPollutant}` : undefined} />
      </div>
    </div>
  );
}
