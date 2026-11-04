import { levelColor } from "../common/Level";
import type { LevelKey } from "../common/Level";

interface MinigraphsProps {
  values: (number | null)[];
  level: LevelKey | null;
  width?: number;
  height?: number;
}

/** Thin inline sparkline (2px line, no axes) -- oldest to newest, left to right. */
export function Minigraphs({ values, level, width = 90, height = 28 }: MinigraphsProps) {
  const points = values.filter((v): v is number => v !== null);
  if (points.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const coords = values.map((v, i) => {
    const x = i * step;
    const y = v === null ? null : height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const segments: string[] = [];
  let current: string[] = [];
  for (const { x, y } of coords) {
    if (y === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${x},${y}`);
    }
  }
  if (current.length > 1) segments.push(current.join(" "));

  return (
    <svg width={width} height={height} role="img" aria-label="Recent AQI trend">
      {segments.map((points, i) => (
        <polyline
          key={i}
          points={points}
          fill="none"
          stroke={levelColor(level)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
