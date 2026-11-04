import { useEffect, useMemo, useState } from "react";
import { dataClient } from "../../api/dataClient";
import { Timeseries } from "./Timeseries";
import { TimeseriesBrush } from "./TimeseriesBrush";
import { PollutantGrid } from "./PollutantGrid";
import type { DailySeriesFile, PollutantMeta, RecentSeriesFile } from "../../api/types";
import type { TimeseriesPoint } from "./types";
import "./TimeseriesExplorer.scss";

type EntityType = "station" | "city" | "state";
type Mode = "daily" | "recent";

interface TimeseriesExplorerProps {
  entityType: EntityType;
  entityId: string;
  label: string;
}

function fetchDaily(entityType: EntityType, entityId: string) {
  if (entityType === "station") return dataClient.dailyStation(entityId);
  if (entityType === "city") return dataClient.dailyCity(entityId);
  return dataClient.dailyState(entityId);
}

function fetchRecent(entityType: EntityType, entityId: string) {
  if (entityType === "station") return dataClient.recentStation(entityId);
  return dataClient.recentCity(entityId);
}

export function TimeseriesExplorer({ entityType, entityId, label }: TimeseriesExplorerProps) {
  const [mode, setMode] = useState<Mode>("daily");
  const [dailyFile, setDailyFile] = useState<DailySeriesFile | null>(null);
  const [recentFile, setRecentFile] = useState<RecentSeriesFile | null>(null);
  const [pollutants, setPollutants] = useState<PollutantMeta[]>([]);
  const [selection, setSelection] = useState<[number, number] | null>(null);

  useEffect(() => {
    dataClient.metaPollutants().then((f) => setPollutants(f.pollutants));
  }, []);

  useEffect(() => {
    setDailyFile(null);
    setRecentFile(null);
    setSelection(null);
    fetchDaily(entityType, entityId)
      .then(setDailyFile)
      .catch(() => setDailyFile({ id: entityId, series: [] }));
    if (entityType !== "state") {
      fetchRecent(entityType, entityId)
        .then(setRecentFile)
        .catch(() => setRecentFile({ id: entityId, series: [] }));
    }
  }, [entityType, entityId]);

  const dailyPoints = useMemo<TimeseriesPoint[] | null>(
    () => (dailyFile ? dailyFile.series.map((e) => ({ x: e.date, y: e.aqi })) : null),
    [dailyFile],
  );
  const recentPoints = useMemo<TimeseriesPoint[] | null>(
    () => (recentFile ? recentFile.series.map((e) => ({ x: e.ts, y: e.aqi })) : null),
    [recentFile],
  );

  const dailyPollutantPoints = useMemo<Record<string, TimeseriesPoint[]> | null>(() => {
    if (!dailyFile) return null;
    const out: Record<string, TimeseriesPoint[]> = {};
    for (const p of pollutants) {
      out[p.id] = dailyFile.series.map((e) => ({ x: e.date, y: e.sub_indices[p.id] ?? null }));
    }
    return out;
  }, [dailyFile, pollutants]);

  const recentPollutantPoints = useMemo<Record<string, TimeseriesPoint[]> | null>(() => {
    if (!recentFile) return null;
    const out: Record<string, TimeseriesPoint[]> = {};
    for (const p of pollutants) {
      out[p.id] = recentFile.series.map((e) => ({ x: e.ts, y: e.readings[p.id] ?? null }));
    }
    return out;
  }, [recentFile, pollutants]);

  const activePoints = mode === "daily" ? dailyPoints : recentPoints;
  const activePollutantPoints = mode === "daily" ? dailyPollutantPoints : recentPollutantPoints;

  const fullSelection = useMemo<[number, number]>(() => [0, (activePoints?.length ?? 1) - 1], [activePoints]);
  const effectiveSelection = selection ?? fullSelection;

  const visiblePoints = useMemo(() => {
    if (!activePoints) return [];
    return activePoints.slice(effectiveSelection[0], effectiveSelection[1] + 1);
  }, [activePoints, effectiveSelection]);

  const visiblePollutantPoints = useMemo<Record<string, TimeseriesPoint[]> | null>(() => {
    if (!activePollutantPoints) return null;
    const out: Record<string, TimeseriesPoint[]> = {};
    for (const [id, pts] of Object.entries(activePollutantPoints)) {
      out[id] = pts.slice(effectiveSelection[0], effectiveSelection[1] + 1);
    }
    return out;
  }, [activePollutantPoints, effectiveSelection]);

  return (
    <div className="timeseries-explorer">
      <div className="timeseries-explorer__header">
        <h3>{label}</h3>
        {entityType !== "state" && (
          <div className="timeseries-explorer__toggle">
            <button
              type="button"
              className={mode === "daily" ? "active" : ""}
              onClick={() => {
                setMode("daily");
                setSelection(null);
              }}
            >
              Full history (daily avg)
            </button>
            <button
              type="button"
              className={mode === "recent" ? "active" : ""}
              onClick={() => {
                setMode("recent");
                setSelection(null);
              }}
            >
              Last 30 days
            </button>
          </div>
        )}
      </div>

      {!activePoints && <p className="timeseries-explorer__loading">Loading…</p>}

      {activePoints && activePoints.length > 0 && (
        <>
          <Timeseries points={visiblePoints} mode={mode} />
          {activePoints.length > 2 && (
            <TimeseriesBrush points={activePoints} selection={effectiveSelection} onChange={setSelection} mode={mode} />
          )}
          {visiblePollutantPoints && (
            <PollutantGrid pollutants={pollutants} pointsByPollutant={visiblePollutantPoints} mode={mode} />
          )}
        </>
      )}

      {activePoints && activePoints.length === 0 && <p className="timeseries-explorer__loading">No data yet.</p>}
    </div>
  );
}
