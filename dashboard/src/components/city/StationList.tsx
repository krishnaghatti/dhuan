import { useEffect, useState } from "react";
import { Table } from "../table/Table";
import type { TableRowData } from "../table/types";
import type { LatestStation } from "../../api/types";
import { fetchSparklines } from "../../utils/sparklines";

interface StationListProps {
  stateId: string;
  cityId: string;
  stations: LatestStation[];
}

export function StationList({ stateId, cityId, stations }: StationListProps) {
  const [sparklines, setSparklines] = useState<Map<string, (number | null)[]>>(new Map());

  useEffect(() => {
    fetchSparklines(
      "station",
      stations.map((s) => s.station_id),
    ).then(setSparklines);
  }, [stations]);

  const rows: TableRowData[] = stations.map((station) => ({
    id: station.station_id,
    name: station.station,
    path: `/state/${stateId}/${cityId}/${station.station_id}`,
    aqi: station.aqi,
    level: station.level,
    dominantPollutant: station.dominant_pollutant,
    sparkline: sparklines.get(station.station_id),
  }));

  return <Table nameColumnLabel="Station" rows={rows} />;
}
