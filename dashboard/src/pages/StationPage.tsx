import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { dataClient } from "../api/dataClient";
import type { LatestData } from "../api/types";
import { StationDetail } from "../components/station/StationDetail";
import { TimeseriesExplorer } from "../components/timeseries/TimeseriesExplorer";

export function StationPage() {
  const { stateSlug, citySlug, stationSlug } = useParams<{
    stateSlug: string;
    citySlug: string;
    stationSlug: string;
  }>();
  const [latest, setLatest] = useState<LatestData | null>(null);

  useEffect(() => {
    dataClient.latest().then(setLatest);
  }, []);

  if (!latest || !stateSlug || !citySlug || !stationSlug) {
    return <div className="page">Loading…</div>;
  }

  const state = latest.states.find((s) => s.state_id === stateSlug);
  const city = state?.cities.find((c) => c.city_id === citySlug);
  const station = city?.stations.find((s) => s.station_id === stationSlug);

  if (!state || !city || !station) {
    return <div className="page">Station not found.</div>;
  }

  return (
    <div className="page">
      <StationDetail
        stationName={station.station}
        cityName={city.city}
        stateId={stateSlug}
        cityId={citySlug}
        lat={station.lat}
        lon={station.lon}
        aqi={station.aqi}
        level={station.level}
        dominantPollutant={station.dominant_pollutant}
      />

      <section className="page__section">
        <TimeseriesExplorer entityType="station" entityId={stationSlug} label={`${station.station} — AQI history`} />
      </section>
    </div>
  );
}
