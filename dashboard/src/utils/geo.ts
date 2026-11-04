import type { Feature, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { slugify } from "./slugify";

export interface StateFeatureProps {
  st_nm: string;
  st_code: string;
}

export type StateFeature = Feature<Geometry, StateFeatureProps>;

/** The vendored topology (public/geo/india-states.json) carries both a
 * 'districts' and a 'states' object sharing the same arcs; we only need the
 * states-level GeometryCollection for the country/state choropleth. */
export function extractStateFeatures(topology: Topology): StateFeature[] {
  const collection = feature(topology, topology.objects.states as never) as unknown as {
    features: StateFeature[];
  };
  return collection.features;
}

/** st_nm values in the vendored map (e.g. "Tamil Nadu") match the pipeline's
 * canonical state names exactly (verified against all 38 raw source
 * variants), so slugify(st_nm) equals the pipeline's state_id. */
export function stateIdForFeature(f: StateFeature): string {
  return slugify(f.properties.st_nm);
}
