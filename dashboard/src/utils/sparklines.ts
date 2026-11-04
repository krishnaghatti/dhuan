import { dataClient } from "../api/dataClient";

type EntityType = "state" | "city" | "station";

const SPARKLINE_POINTS = 14;

function fetchDaily(entityType: EntityType, id: string) {
  if (entityType === "state") return dataClient.dailyState(id);
  if (entityType === "city") return dataClient.dailyCity(id);
  return dataClient.dailyStation(id);
}

/** Last-14-day AQI trend per id, for Table row sparklines. Small static
 * per-entity files, so fetching one per row is cheap even for ~30 rows. */
export async function fetchSparklines(entityType: EntityType, ids: string[]): Promise<Map<string, (number | null)[]>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const file = await fetchDaily(entityType, id);
        return [id, file.series.slice(-SPARKLINE_POINTS).map((e) => e.aqi)] as const;
      } catch {
        return [id, [] as (number | null)[]] as const;
      }
    }),
  );
  return new Map(entries);
}
