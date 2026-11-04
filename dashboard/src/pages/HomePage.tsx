import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataClient } from "../api/dataClient";
import type { LatestData } from "../api/types";
import { Banner } from "../components/layout/Banner";
import { Legend } from "../components/common/Legend";
import { MapExplorer } from "../components/map/MapExplorer";
import { Table } from "../components/table/Table";
import type { TableRowData } from "../components/table/types";
import { fetchSparklines } from "../utils/sparklines";

export function HomePage() {
  const navigate = useNavigate();
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [sparklines, setSparklines] = useState<Map<string, (number | null)[]>>(new Map());

  useEffect(() => {
    dataClient.latest().then((data) => {
      setLatest(data);
      fetchSparklines(
        "state",
        data.states.map((s) => s.state_id),
      ).then(setSparklines);
    });
  }, []);

  const rows = useMemo<TableRowData[]>(() => {
    if (!latest) return [];
    return latest.states.map((s) => ({
      id: s.state_id,
      name: s.state,
      path: `/state/${s.state_id}`,
      aqi: s.aqi,
      level: s.level,
      dominantPollutant: s.dominant_pollutant,
      sparkline: sparklines.get(s.state_id),
    }));
  }, [latest, sparklines]);

  return (
    <div className="page">
      <Banner />
      <section className="page__section">
        <div className="page__map-legend">
          <div className="page__map-legend-map">
            <MapExplorer
              onSelectState={(stateId) => navigate(`/state/${stateId}`)}
              onSelectCity={(cityId, stateId) => navigate(`/state/${stateId}/${cityId}`)}
            />
          </div>
          <Legend />
        </div>
      </section>
      <section className="page__section">
        <h2>States</h2>
        <Table nameColumnLabel="State" rows={rows} />
      </section>
    </div>
  );
}
