import type { Topology } from "topojson-specification";
import type {
  DailySeriesFile,
  LastBuild,
  LatestData,
  MetaCity,
  MetaStation,
  MetaState,
  PollutantsFile,
  RecentSeriesFile,
} from "./types";

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function cached<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetchJson<T>(path));
  }
  return cache.get(path) as Promise<T>;
}

export const dataClient = {
  latest: () => cached<LatestData>("/data/latest/latest.json"),

  metaStates: () => cached<MetaState[]>("/data/meta/states.json"),
  metaCities: () => cached<MetaCity[]>("/data/meta/cities.json"),
  metaStations: () => cached<MetaStation[]>("/data/meta/stations.json"),
  metaPollutants: () => cached<PollutantsFile>("/data/meta/pollutants.json"),
  lastBuild: () => cached<LastBuild>("/data/meta/last_build.json"),

  dailyState: (stateId: string) => cached<DailySeriesFile>(`/data/timeseries/daily/state/${stateId}.json`),
  dailyCity: (cityId: string) => cached<DailySeriesFile>(`/data/timeseries/daily/city/${cityId}.json`),
  dailyStation: (stationId: string) => cached<DailySeriesFile>(`/data/timeseries/daily/station/${stationId}.json`),

  recentCity: (cityId: string) => cached<RecentSeriesFile>(`/data/timeseries/recent30d/city/${cityId}.json`),
  recentStation: (stationId: string) => cached<RecentSeriesFile>(`/data/timeseries/recent30d/station/${stationId}.json`),

  geoIndiaStates: () => cached<Topology>("/geo/india-states.json"),
};

export function clearDataCache(): void {
  cache.clear();
}
