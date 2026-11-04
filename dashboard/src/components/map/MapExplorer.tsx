import { useEffect, useMemo, useState } from "react";
import { dataClient } from "../../api/dataClient";
import type { LatestCity, LatestData } from "../../api/types";
import { extractStateFeatures, stateIdForFeature } from "../../utils/geo";
import type { StateFeature } from "../../utils/geo";
import type { CityMarkerData } from "./CityMarkers";
import { MapVisualizer } from "./MapVisualizer";

interface MapExplorerProps {
  /** When set, the map zooms to this one state; otherwise every city
   * nationwide is shown as a marker on the full country map. */
  selectedStateId?: string;
  onSelectState?: (stateId: string) => void;
  onSelectCity?: (cityId: string, stateId: string) => void;
}

function cityCentroid(stations: { lat: number | null; lon: number | null }[]): [number, number] | null {
  const withCoords = stations.filter((s) => s.lat !== null && s.lon !== null) as { lat: number; lon: number }[];
  if (withCoords.length === 0) return null;
  const lat = withCoords.reduce((sum, s) => sum + s.lat, 0) / withCoords.length;
  const lon = withCoords.reduce((sum, s) => sum + s.lon, 0) / withCoords.length;
  return [lat, lon];
}

function toMarker(city: LatestCity, stateId: string): CityMarkerData | null {
  const centroid = cityCentroid(city.stations);
  if (!centroid) return null;
  const [lat, lon] = centroid;
  return {
    id: city.city_id,
    stateId,
    name: city.city,
    lat,
    lon,
    aqi: city.aqi,
    level: city.level,
    dominantPollutant: city.dominant_pollutant,
    stationCount: city.station_count,
  };
}

export function MapExplorer({ selectedStateId, onSelectState, onSelectCity }: MapExplorerProps) {
  const [features, setFeatures] = useState<StateFeature[] | null>(null);
  const [latest, setLatest] = useState<LatestData | null>(null);

  useEffect(() => {
    dataClient.geoIndiaStates().then((topology) => setFeatures(extractStateFeatures(topology)));
    dataClient.latest().then(setLatest);
  }, []);

  const cityMarkers = useMemo<CityMarkerData[] | undefined>(() => {
    if (!latest) return undefined;
    if (!selectedStateId) {
      // Country view: every monitored city nationwide, not just one state.
      return latest.states
        .flatMap((s) => s.cities.map((city) => toMarker(city, s.state_id)))
        .filter((c): c is CityMarkerData => c !== null);
    }
    const state = latest.states.find((s) => s.state_id === selectedStateId);
    if (!state) return [];
    return state.cities
      .map((city) => toMarker(city, state.state_id))
      .filter((c): c is CityMarkerData => c !== null);
  }, [selectedStateId, latest]);

  const visibleFeatures = useMemo(() => {
    if (!features) return [];
    if (!selectedStateId) return features;
    return features.filter((f) => stateIdForFeature(f) === selectedStateId);
  }, [features, selectedStateId]);

  if (!features || !latest) {
    return <div className="map-explorer-loading">Loading map…</div>;
  }

  return (
    <MapVisualizer
      features={visibleFeatures}
      selectedStateId={selectedStateId}
      onStateClick={selectedStateId ? undefined : onSelectState}
      cityMarkers={cityMarkers}
      onCityClick={onSelectCity}
    />
  );
}
