import { useMemo, useState } from "react";
import { LEVELS } from "../common/Level";
import { pickTicks } from "./ticks";
import type { SeriesMode } from "./ticks";
import type { TimeseriesPoint } from "./types";
import "./Timeseries.scss";

interface TimeseriesProps {
  points: TimeseriesPoint[];
  /** Logical canvas size (SVG viewBox units). The element itself always
   * stretches to 100% of its container's width via CSS + preserveAspectRatio
   * "none" -- these are just the coordinate space AQI values are plotted
   * into, not the rendered pixel size. */
  width?: number;
  height?: number;
  yLabel?: string;
  /** Severity bands only make sense on the 0-500 composite/sub-index AQI
   * scale. Per-pollutant raw-concentration charts (different units per
   * pollutant) disable this and scale to their own data instead. */
  showLevelBands?: boolean;
  /** Line/dot/crosshair color override, used to give each pollutant a
   * distinct identity in the per-pollutant grid. Defaults to the neutral
   * text color via CSS when omitted (single continuous magnitude). */
  color?: string;
  /** Governs x-axis tick granularity: month labels for full-history daily
   * series, day labels for the last-30-days recent series. */
  mode?: SeriesMode;
}

const MARGIN = { top: 12, right: 16, bottom: 24, left: 36 };

/** AQI is one continuous magnitude, so the line itself uses a single neutral
 * hue (sequential-encoding convention) -- the CPCB severity bands are shown
 * as recessive reference lines for context, not as per-segment color, since
 * per-point recoloring would fight the line's own readability. */
export function Timeseries({
  points,
  width = 720,
  height = 260,
  yLabel = "AQI",
  showLevelBands = true,
  color,
  mode = "daily",
}: TimeseriesProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const maxY = useMemo(() => {
    const values = points.map((p) => p.y).filter((v): v is number => v !== null);
    if (showLevelBands) return Math.max(500, ...values);
    return Math.max(1, ...values) * 1.1;
  }, [points, showLevelBands]);

  const xScale = (i: number) => (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerWidth);
  const yScale = (v: number) => innerHeight - (v / maxY) * innerHeight;

  const segments = useMemo(() => {
    const parts: string[] = [];
    let current: string[] = [];
    points.forEach((p, i) => {
      if (p.y === null) {
        if (current.length > 1) parts.push(current.join(" "));
        current = [];
      } else {
        current.push(`${xScale(i)},${yScale(p.y)}`);
      }
    });
    if (current.length > 1) parts.push(current.join(" "));
    return parts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, innerWidth, innerHeight, maxY]);

  const xTicks = useMemo(
    () => pickTicks(points, mode, Math.max(2, Math.round(innerWidth / 90))),
    [points, mode, innerWidth],
  );

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    // Use the rect's actual on-screen width (not the logical `innerWidth`
    // viewBox unit count) so hit-testing stays correct even though the SVG
    // is stretched to fill its container via CSS + preserveAspectRatio.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="timeseries">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label={`${yLabel} over time`}
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {showLevelBands &&
            LEVELS.map((level) =>
              level.maxAqi <= maxY ? (
                <g key={level.key} className="timeseries__band">
                  <line x1={0} x2={innerWidth} y1={yScale(level.maxAqi)} y2={yScale(level.maxAqi)} />
                  <text x={innerWidth} y={yScale(level.maxAqi)} dy={-2} textAnchor="end">
                    {level.maxAqi}
                  </text>
                </g>
              ) : null,
            )}

          {segments.map((seg, i) => (
            <polyline key={i} points={seg} className="timeseries__line" style={color ? { stroke: color } : undefined} />
          ))}

          {xTicks.map((t, i) => (
            <g key={t.index} className="timeseries__xtick">
              <line x1={xScale(t.index)} x2={xScale(t.index)} y1={innerHeight} y2={innerHeight + 4} />
              <text
                x={xScale(t.index)}
                y={innerHeight + 16}
                textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              >
                {t.label}
              </text>
            </g>
          ))}

          {hovered && hoverIndex !== null && (
            <g>
              <line x1={xScale(hoverIndex)} x2={xScale(hoverIndex)} y1={0} y2={innerHeight} className="timeseries__crosshair" />
              {hovered.y !== null && (
                <circle
                  cx={xScale(hoverIndex)}
                  cy={yScale(hovered.y)}
                  r={3.5}
                  className="timeseries__dot"
                  style={color ? { fill: color } : undefined}
                />
              )}
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
          />
        </g>
      </svg>
      {hovered && (
        <div className="timeseries__tooltip">
          <strong>{hovered.y ?? "no data"}</strong> {yLabel} — {hovered.x}
        </div>
      )}
    </div>
  );
}
