import { levelColor, levelInfo } from "../common/Level";
import type { CityMarkerData } from "./CityMarkers";
import "./CityTooltip.scss";

interface CityTooltipProps {
  city: CityMarkerData;
  /** Viewport (clientX/clientY) coordinates of the pointer. */
  x: number;
  y: number;
}

/** Custom hover tooltip replacing the native SVG <title> -- shows the
 * location name plus its AQI data broken out as rows in a small table
 * (native tooltips can only render a single plain-text line). Positioned
 * with `position: fixed` directly off clientX/clientY, so it tracks the
 * cursor regardless of how the map's SVG is scaled by its viewBox. */
export function CityTooltip({ city, x, y }: CityTooltipProps) {
  const info = levelInfo(city.level);
  const flipX = x > window.innerWidth * 0.7;
  const flipY = y > window.innerHeight * 0.7;

  return (
    <div
      className="city-tooltip"
      style={{
        left: x,
        top: y,
        transform: `translate(${flipX ? "-100%" : "12px"}, ${flipY ? "calc(-100% - 12px)" : "12px"})`,
      }}
    >
      <div className="city-tooltip__name">{city.name}</div>
      <table className="city-tooltip__table">
        <tbody>
          <tr>
            <th>AQI</th>
            <td>{city.aqi ?? "No data"}</td>
          </tr>
          <tr>
            <th>Level</th>
            <td>
              <span className="city-tooltip__dot" style={{ background: levelColor(city.level) }} />
              {info?.label ?? "No data"}
            </td>
          </tr>
          <tr>
            <th>Dominant pollutant</th>
            <td>{city.dominantPollutant ?? "—"}</td>
          </tr>
          <tr>
            <th>Stations</th>
            <td>{city.stationCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
