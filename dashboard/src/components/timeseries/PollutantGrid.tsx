import { Timeseries } from "./Timeseries";
import { pollutantColor } from "../common/pollutantColors";
import type { PollutantMeta } from "../../api/types";
import type { TimeseriesPoint } from "./types";
import "./PollutantGrid.scss";

type Mode = "daily" | "recent";

interface PollutantGridProps {
  pollutants: PollutantMeta[];
  pointsByPollutant: Record<string, TimeseriesPoint[]>;
  mode: Mode;
}

function latestValue(points: TimeseriesPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].y !== null) return points[i].y;
  }
  return null;
}

/** Per-pollutant breakdown below the composite AQI chart: daily mode plots
 * each pollutant's CPCB sub-index (comparable 0-500 AQI scale, straight from
 * the pipeline, no client-side breakpoint math); recent mode plots the raw
 * concentration in its native unit, since sub-indices aren't precomputed
 * per-snapshot (see RecentSeriesFile's schema note -- avoids duplicating the
 * breakpoint table in TS). */
export function PollutantGrid({ pollutants, pointsByPollutant, mode }: PollutantGridProps) {
  const withData = pollutants.filter((p) => {
    const points = pointsByPollutant[p.id];
    return points && points.some((pt) => pt.y !== null);
  });

  if (withData.length === 0) return null;

  return (
    <div className="pollutant-grid">
      <h4 className="pollutant-grid__title">By pollutant</h4>
      <div className="pollutant-grid__cells">
        {withData.map((p) => {
          const points = pointsByPollutant[p.id];
          const latest = latestValue(points);
          const unit = mode === "daily" ? "sub-index" : p.unit.replace("3", "³");
          return (
            <div key={p.id} className="pollutant-grid__cell">
              <div className="pollutant-grid__cell-header">
                <span className="pollutant-grid__swatch" style={{ background: pollutantColor(p.id) }} />
                <span className="pollutant-grid__label">{p.label}</span>
                <span className="pollutant-grid__value">
                  {latest !== null ? `${latest} ${unit}` : "no data"}
                </span>
              </div>
              <Timeseries
                points={points}
                width={320}
                height={140}
                yLabel={unit}
                showLevelBands={false}
                color={pollutantColor(p.id)}
                mode={mode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
