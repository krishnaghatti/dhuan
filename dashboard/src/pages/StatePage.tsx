import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dataClient } from "../api/dataClient";
import type { LatestData, LatestState, MetaState } from "../api/types";
import { MapExplorer } from "../components/map/MapExplorer";
import { StateHeader } from "../components/state/StateHeader";
import { StateMeta } from "../components/state/StateMeta";
import { Table } from "../components/table/Table";
import type { TableRowData } from "../components/table/types";
import { TimeseriesExplorer } from "../components/timeseries/TimeseriesExplorer";
import { fetchSparklines } from "../utils/sparklines";

export function StatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const navigate = useNavigate();
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [meta, setMeta] = useState<MetaState[] | null>(null);
  const [sparklines, setSparklines] = useState<Map<string, (number | null)[]>>(new Map());

  useEffect(() => {
    dataClient.latest().then(setLatest);
    dataClient.metaStates().then(setMeta);
  }, []);

  const state: LatestState | undefined = latest?.states.find((s) => s.state_id === stateSlug);

  useEffect(() => {
    if (!state) return;
    fetchSparklines(
      "city",
      state.cities.map((c) => c.city_id),
    ).then(setSparklines);
  }, [state]);

  const rows = useMemo<TableRowData[]>(() => {
    if (!state) return [];
    return state.cities.map((c) => ({
      id: c.city_id,
      name: c.city,
      path: `/state/${stateSlug}/${c.city_id}`,
      aqi: c.aqi,
      level: c.level,
      dominantPollutant: c.dominant_pollutant,
      sparkline: sparklines.get(c.city_id),
    }));
  }, [state, sparklines, stateSlug]);

  if (!latest || !meta || !stateSlug) {
    return <div className="page">Loading…</div>;
  }
  if (!state) {
    return <div className="page">State not found.</div>;
  }

  const stateMeta = meta.find((m) => m.id === stateSlug);

  return (
    <div className="page">
      <StateHeader name={state.state} aqi={state.aqi} level={state.level} dominantPollutant={state.dominant_pollutant} />
      {stateMeta && <div className="page__meta"><StateMeta cityCount={stateMeta.city_count} stationCount={stateMeta.station_count} /></div>}

      <section className="page__section">
        <MapExplorer selectedStateId={stateSlug} onSelectCity={(cityId) => navigate(`/state/${stateSlug}/${cityId}`)} />
      </section>

      <section className="page__section">
        <h2>Cities</h2>
        <Table nameColumnLabel="City" rows={rows} />
      </section>

      <section className="page__section">
        <TimeseriesExplorer entityType="state" entityId={stateSlug} label={`${state.state} — AQI history`} />
      </section>
    </div>
  );
}
