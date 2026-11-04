import { StateMetaCard } from "./StateMetaCard";
import "./StateMeta.scss";

interface StateMetaProps {
  cityCount: number;
  stationCount: number;
}

export function StateMeta({ cityCount, stationCount }: StateMetaProps) {
  return (
    <div className="state-meta">
      <StateMetaCard label="Cities monitored" value={cityCount} />
      <StateMetaCard label="Stations" value={stationCount} />
    </div>
  );
}
