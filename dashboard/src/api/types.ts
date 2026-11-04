/**
 * Types mirroring pipeline/*.py's JSON output schemas exactly. The pipeline
 * (Python) and this app (TS) share a JSON contract with no runtime type
 * checking between them, so keep these in lockstep with the writer code:
 * build_latest.py, ingest_daily.py, ingest_recent.py, build_meta.py.
 */
import type { LevelKey } from "../components/common/Level";

export interface LatestStation {
  station_id: string;
  station: string;
  lat: number | null;
  lon: number | null;
  date: string | null;
  aqi: number | null;
  level: LevelKey | null;
  dominant_pollutant: string | null;
}

export interface LatestCity {
  city_id: string;
  city: string;
  state_id: string;
  station_count: number;
  aqi: number | null;
  level: LevelKey | null;
  dominant_pollutant: string | null;
  stations: LatestStation[];
}

export interface LatestState {
  state_id: string;
  state: string;
  aqi: number | null;
  level: LevelKey | null;
  dominant_pollutant: string | null;
  cities: LatestCity[];
}

export interface LatestData {
  generated_at: string;
  states: LatestState[];
}

export interface DailySeriesEntry {
  date: string;
  aqi: number | null;
  level: LevelKey | null;
  dominant_pollutant: string | null;
  sub_indices: Record<string, number>;
  n_readings: Record<string, number>;
}

export interface DailySeriesFile {
  id: string;
  city_id?: string;
  state_id?: string;
  series: DailySeriesEntry[];
}

export interface RecentSnapshotEntry {
  ts: string;
  readings: Record<string, number>;
  aqi: number | null;
  level: LevelKey | null;
  dominant_pollutant: string | null;
}

export interface RecentSeriesFile {
  id: string;
  city_id?: string;
  state_id?: string | null;
  series: RecentSnapshotEntry[];
}

export interface MetaState {
  id: string;
  name: string;
  city_count: number;
  station_count: number;
}

export interface MetaCity {
  id: string;
  name: string;
  state_id: string;
  lat: number | null;
  lon: number | null;
  station_count: number;
}

export interface MetaStation {
  id: string;
  name: string;
  city_id: string;
  state_id: string;
  lat: number | null;
  lon: number | null;
  last_seen: string;
}

export interface PollutantBreakpoint {
  c_lo: number;
  c_hi: number | null;
  i_lo: number;
  i_hi: number;
}

export interface PollutantMeta {
  id: string;
  label: string;
  unit: string;
  breakpoints: PollutantBreakpoint[];
}

export interface LevelMeta {
  key: LevelKey;
  label: string;
  max_aqi: number;
}

export interface PollutantsFile {
  pollutants: PollutantMeta[];
  levels: LevelMeta[];
}

export interface LastBuild {
  generated_at: string;
  files_processed: number;
  files_total_available: number;
  files_skipped: number;
  date_range_start: string | null;
  date_range_end: string | null;
  sampled: boolean;
}
