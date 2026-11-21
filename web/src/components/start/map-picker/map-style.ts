import type { StyleSpecification } from "maplibre-gl"

const ORTO_WMS =
  "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=Raster&STYLES=&FORMAT=image/jpeg&SRS=EPSG:3857&WIDTH=512&HEIGHT=512&BBOX={bbox-epsg-3857}"

const KIEG_WMS =
  "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=dzialki,numery_dzialek&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&SRS=EPSG:3857&WIDTH=512&HEIGHT=512&BBOX={bbox-epsg-3857}"

export const ORTO_ZOOM = 13
export const PARCELS_ZOOM = 15
export const PICK_ZOOM = 13

export const POLAND_CENTER: [number, number] = [19.2, 52.05]
export const POLAND_ZOOM = 5.4
export const POLAND_BOUNDS: [[number, number], [number, number]] = [
  [11.5, 47.6],
  [27.5, 56.2],
]

const EMPTY = { type: "FeatureCollection" as const, features: [] }

export const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    },
    orto: {
      type: "raster",
      tiles: [ORTO_WMS],
      tileSize: 512,
      minzoom: ORTO_ZOOM - 2,
      maxzoom: 20,
      attribution: 'Ortofotomapa © <a href="https://www.geoportal.gov.pl" target="_blank" rel="noreferrer">GUGiK</a>',
    },
    kieg: {
      type: "raster",
      tiles: [KIEG_WMS],
      tileSize: 512,
      minzoom: PARCELS_ZOOM - 2,
      maxzoom: 20,
      attribution: "Działki © GUGiK (KIEG)",
    },
    parcel: { type: "geojson", data: EMPTY },
    point: { type: "geojson", data: EMPTY },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#F7E8CE" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-saturation": -0.25, "raster-contrast": -0.05 },
    },
    {
      id: "orto",
      type: "raster",
      source: "orto",
      minzoom: ORTO_ZOOM - 0.5,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], ORTO_ZOOM - 0.5, 0, ORTO_ZOOM + 0.5, 1],
      },
    },
    {
      id: "kieg",
      type: "raster",
      source: "kieg",
      minzoom: PARCELS_ZOOM - 0.5,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], PARCELS_ZOOM - 0.5, 0, PARCELS_ZOOM + 0.3, 0.9],
      },
    },
    { id: "parcel-fill", type: "fill", source: "parcel", paint: { "fill-color": "#3FA3B0", "fill-opacity": 0.3 } },
    {
      id: "parcel-glow",
      type: "line",
      source: "parcel",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#8FE0E6", "line-width": 14, "line-blur": 8, "line-opacity": 0.85 },
    },
    {
      id: "parcel-casing",
      type: "line",
      source: "parcel",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#FFFDF8", "line-width": 6 },
    },
    {
      id: "parcel-line",
      type: "line",
      source: "parcel",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#0E6E73", "line-width": 3 },
    },
    {
      id: "point-halo",
      type: "circle",
      source: "point",
      paint: { "circle-radius": 16, "circle-color": "#0E6E73", "circle-opacity": 0.22 },
    },
    {
      id: "point",
      type: "circle",
      source: "point",
      paint: { "circle-radius": 7, "circle-color": "#0E6E73", "circle-stroke-color": "#FFFDF8", "circle-stroke-width": 3 },
    },
  ],
}
