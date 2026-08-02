import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import usCounties from "us-atlas/counties-10m.json";
import usStates from "us-atlas/states-10m.json";

// The original map source exposed the country geometry as `features`. Keep that
// interface stable so every category can share this locally bundled runtime.
const world = {
  ...worldAtlas,
  objects: {
    ...worldAtlas.objects,
    features: worldAtlas.objects.countries,
  },
};

export {
  feature,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  usCounties,
  usStates,
  world,
};
