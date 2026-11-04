import type { LevelKey } from "./Level";
import { levelColor, levelInfo } from "./Level";
import "./StatCard.scss";

interface StatCardProps {
  label: string;
  aqi: number | null;
  level: LevelKey | null;
  sublabel?: string;
}

export function StatCard({ label, aqi, level, sublabel }: StatCardProps) {
  const info = levelInfo(level);
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">
        <span className="stat-card__swatch" style={{ background: levelColor(level) }} aria-hidden="true" />
        <span className="stat-card__aqi">{aqi ?? "—"}</span>
        <span className="stat-card__level">{info?.label ?? "No data"}</span>
      </div>
      {sublabel && <div className="stat-card__sublabel">{sublabel}</div>}
    </div>
  );
}
