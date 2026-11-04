import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { StateFeature } from "../../utils/geo";
import { stateIdForFeature } from "../../utils/geo";
import { CityTooltip } from "./CityTooltip";
import type { CityMarkerData } from "./CityMarkers";
import { CityMarkers } from "./CityMarkers";
import "./MapVisualizer.scss";

interface MapVisualizerProps {
  features: StateFeature[];
  selectedStateId?: string;
  onStateClick?: (stateId: string) => void;
  cityMarkers?: CityMarkerData[];
  onCityClick?: (cityId: string, stateId: string) => void;
  width?: number;
  height?: number;
}

interface HoverState {
  city: CityMarkerData;
  x: number;
  y: number;
}

/** Bubble map, styled after covid19india.org: state geometry is plain
 * background context (light fill, thin border) that AQI never colors --
 * every city/town's AQI is shown directly as a proportional, translucent
 * circle (see CityMarkers) so the full country map reads at city
 * granularity, not aggregated per state. Rendered with d3-geo +
 * topojson-client directly (no react-simple-maps wrapper: its React peer
 * range tops out at 18.x, which conflicts with this project's React 19
 * scaffold). */
export function MapVisualizer({
  features,
  selectedStateId,
  onStateClick,
  cityMarkers,
  onCityClick,
  width = 480,
  height = 520,
}: MapVisualizerProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const featureCollection = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const projection = useMemo(() => geoMercator().fitSize([width, height], featureCollection), [featureCollection, width, height]);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="map-visualizer" role="img" aria-label="India AQI map">
        <g className="map-visualizer__basemap">
          {features.map((f) => {
            const stateId = stateIdForFeature(f);
            const d = pathGenerator(f);
            if (!d) return null;
            return (
              <path
                key={stateId}
                d={d}
                className="map-visualizer__state"
                stroke={stateId === selectedStateId ? "var(--text-primary)" : "var(--border)"}
                strokeWidth={stateId === selectedStateId ? 1.5 : 0.75}
                onClick={onStateClick ? () => onStateClick(stateId) : undefined}
                style={{ cursor: onStateClick ? "pointer" : undefined }}
              />
            );
          })}
        </g>
        {cityMarkers && (
          <CityMarkers
            cities={cityMarkers}
            projection={projection}
            onCityClick={onCityClick}
            onHover={(city, x, y) => setHover(city ? { city, x, y } : null)}
          />
        )}
      </svg>
      {hover && <CityTooltip city={hover.city} x={hover.x} y={hover.y} />}
    </>
  );
}
