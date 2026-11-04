import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { dataClient } from "../api/dataClient";
import type { LatestData } from "../api/types";
import { CityHeader } from "../components/city/CityHeader";
import { StationList } from "../components/city/StationList";
import { TimeseriesExplorer } from "../components/timeseries/TimeseriesExplorer";

export function CityPage() {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const [latest, setLatest] = useState<LatestData | null>(null);

  useEffect(() => {
    dataClient.latest().then(setLatest);
  }, []);

  if (!latest || !stateSlug || !citySlug) {
    return <div className="page">Loading…</div>;
  }

  const state = latest.states.find((s) => s.state_id === stateSlug);
  const city = state?.cities.find((c) => c.city_id === citySlug);

  if (!state || !city) {
    return <div className="page">City not found.</div>;
  }

  return (
    <div className="page">
      <CityHeader
        cityName={city.city}
        stateName={state.state}
        stateId={stateSlug}
        aqi={city.aqi}
        level={city.level}
        dominantPollutant={city.dominant_pollutant}
        stationCount={city.station_count}
      />

      <section className="page__section">
        <h2>Stations</h2>
        <StationList stateId={stateSlug} cityId={citySlug} stations={city.stations} />
      </section>

      <section className="page__section">
        <TimeseriesExplorer entityType="city" entityId={citySlug} label={`${city.city} — AQI history`} />
      </section>
    </div>
  );
}
