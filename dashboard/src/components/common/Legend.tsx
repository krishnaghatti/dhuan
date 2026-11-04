import { LEVELS } from "./Level";
import "./Legend.scss";

export function Legend() {
  return (
    <ul className="legend" aria-label="AQI severity scale">
      {LEVELS.map((level) => (
        <li key={level.key} className="legend__item">
          <span className="legend__swatch" style={{ background: `var(--level-${level.key})` }} aria-hidden="true" />
          <span className="legend__label">{level.label}</span>
          <span className="legend__range">
            {level.key === "severe" ? `${LEVELS[LEVELS.length - 2].maxAqi + 1}+` : `≤${level.maxAqi}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
