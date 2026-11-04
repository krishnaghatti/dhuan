import type { GeoProjection } from "d3-geo";
import { levelColor } from "../common/Level";
import type { LevelKey } from "../common/Level";
import { bubbleRadius } from "./bubbleScale";

export interface CityMarkerData {
  id: string;
  stateId: string;
  name: string;
  lat: number;
  lon: number;
  aqi: number | null;
  level: LevelKey | null;
  dominantPollutant: string | null;
  stationCount: number;
}

interface CityMarkersProps {
  cities: CityMarkerData[];
  projection: GeoProjection;
  onCityClick?: (cityId: string, stateId: string) => void;
  onHover?: (city: CityMarkerData | null, clientX: number, clientY: number) => void;
}

const CITY_BUBBLE_MIN_R = 4;
const CITY_BUBBLE_MAX_R = 18;
// Translucent fill so overlapping circles (dense metro clusters, or the
// full country view with 500+ cities at once) stay legible instead of
// fully occluding whatever's underneath.
const FILL_OPACITY = 0.62;

/** City/station geography is shown as proportional-symbol markers over the
 * state basemap rather than a city-shaped choropleth -- CPCB "cities" are
 * monitoring-network groupings, not clean administrative boundaries, so
 * there's no matching city geojson to fill. Radius scales with AQI (see
 * bubbleScale.ts); color follows Level.ts's severity scale, which runs
 * green (Good) through yellow/orange (Moderate/Poor) to red (Severe).
 * Hover is reported up via onHover rather than a native <title> -- the
 * caller renders a CityTooltip so the AQI breakdown can be a table, not a
 * single plain-text line. */
export function CityMarkers({ cities, projection, onCityClick, onHover }: CityMarkersProps) {
  // Largest first so it paints at the bottom -- keeps smaller bubbles
  // (drawn later, on top) from being hidden underneath big neighbors.
  const sorted = [...cities].sort((a, b) => (b.aqi ?? 0) - (a.aqi ?? 0));

  return (
    <g className="city-markers">
      {sorted.map((city) => {
        const point = projection([city.lon, city.lat]);
        if (!point) return null;
        const [x, y] = point;
        return (
          <g
            key={city.id}
            transform={`translate(${x}, ${y})`}
            className="city-markers__marker"
            onClick={onCityClick ? () => onCityClick(city.id, city.stateId) : undefined}
            onMouseEnter={(e) => onHover?.(city, e.clientX, e.clientY)}
            onMouseMove={(e) => onHover?.(city, e.clientX, e.clientY)}
            onMouseLeave={() => onHover?.(null, 0, 0)}
            style={{ cursor: onCityClick ? "pointer" : undefined }}
          >
            <circle
              r={bubbleRadius(city.aqi, CITY_BUBBLE_MIN_R, CITY_BUBBLE_MAX_R)}
              fill={levelColor(city.level)}
              fillOpacity={FILL_OPACITY}
              stroke={levelColor(city.level)}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}
