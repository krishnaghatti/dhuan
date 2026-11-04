import { useMemo, useRef, useState } from "react";
import { pickTicks } from "./ticks";
import type { SeriesMode } from "./ticks";
import type { TimeseriesPoint } from "./types";
import "./TimeseriesBrush.scss";

interface TimeseriesBrushProps {
  points: TimeseriesPoint[];
  selection: [number, number];
  onChange: (selection: [number, number]) => void;
  width?: number;
  height?: number;
  /** Governs x-axis tick granularity: month labels for full-history daily
   * series, day labels for the last-30-days recent series. */
  mode?: SeriesMode;
}

const AXIS_HEIGHT = 16;

/** Full-range overview strip with a draggable selection window, used to zoom
 * the main Timeseries chart into a sub-range without a separate data fetch. */
export function TimeseriesBrush({
  points,
  selection,
  onChange,
  width = 720,
  height = 40,
  mode = "daily",
}: TimeseriesBrushProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const values = points.map((p) => p.y).filter((v): v is number => v !== null);
  const maxY = Math.max(1, ...values);
  const xScale = (i: number) => (points.length <= 1 ? 0 : (i / (points.length - 1)) * width);
  const yScale = (v: number) => height - (v / maxY) * height;
  const totalHeight = height + AXIS_HEIGHT;

  const xTicks = useMemo(() => pickTicks(points, mode, Math.max(2, Math.round(width / 90))), [points, mode, width]);

  const linePoints = points
    .map((p, i) => (p.y === null ? null : `${xScale(i)},${yScale(p.y)}`))
    .filter((v): v is string => v !== null)
    .join(" ");

  function indexAtClientX(clientX: number): number {
    const rect = svgRef.current!.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const index = indexAtClientX(e.clientX);
    setDragStart(index);
    onChange([index, index]);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragStart === null) return;
    const index = indexAtClientX(e.clientX);
    onChange([Math.min(dragStart, index), Math.max(dragStart, index)]);
  }

  function handlePointerUp() {
    setDragStart(null);
  }

  const [selStart, selEnd] = selection;

  return (
    <svg
      ref={svgRef}
      className="timeseries-brush"
      width={width}
      height={totalHeight}
      viewBox={`0 0 ${width} ${totalHeight}`}
      preserveAspectRatio="none"
      style={{ height: totalHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <polyline points={linePoints} className="timeseries-brush__line" />
      <rect
        x={xScale(selStart)}
        y={0}
        width={Math.max(1, xScale(selEnd) - xScale(selStart))}
        height={height}
        className="timeseries-brush__window"
      />
      {xTicks.map((t, i) => (
        <text
          key={t.index}
          className="timeseries-brush__tick"
          x={xScale(t.index)}
          y={height + AXIS_HEIGHT - 4}
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}
