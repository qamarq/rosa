import "server-only"
import { cached } from "@/server/cache"
import { distanceKm } from "@/server/geo"
import { fetchJson } from "@/server/http"

export type GroundwaterReading = { place: string; distanceKm: number; depthM: number; measuredAt: string | null; unconfined: boolean }

type Point = { place: string; lat: number; lon: number; depthM: number; measuredAt: string | null; unconfined: boolean }
type Feature = {
  attributes: { MIEJSCOWOSC: string | null; GMINA: string | null; CHARAKTER_PUNKTU: string | null; GLEBOKOSC_ZWIERCIADLA: number | null; DATA_POMIARU: number | null }
  geometry?: { x: number; y: number }
}
type QueryResponse = { features?: Feature[]; error?: { message?: string } }

const URL_BASE = "https://cbdgmapa.pgi.gov.pl/arcgis/rest/services/hydrogeologia/mwp/MapServer/0/query"
const RADIUS_KM = 20
const WARSAW_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" })

async function monitoringPoints(lat: number, lon: number): Promise<Point[]> {
  const url =
    URL_BASE +
    "?" +
    new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      distance: String((RADIUS_KM + 2) * 1000),
      units: "esriSRUnit_Meter",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "MIEJSCOWOSC,GMINA,CHARAKTER_PUNKTU,GLEBOKOSC_ZWIERCIADLA,DATA_POMIARU,ZWIERCIADLO_SWOBODNE,GLEBOKOSC_OTWORU",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    })
  const res = await fetchJson<QueryResponse>(url, 4000)
  if (res.error || !res.features) throw new Error(`PIG-PIB: ${res.error?.message ?? "no features"}`)
  return res.features
    .filter((f) => f.geometry && f.attributes.GLEBOKOSC_ZWIERCIADLA !== null)
    .map((f) => ({
      place: f.attributes.MIEJSCOWOSC ?? f.attributes.GMINA ?? "",
      lat: f.geometry!.y,
      lon: f.geometry!.x,
      depthM: Math.round(f.attributes.GLEBOKOSC_ZWIERCIADLA! * 100) / 100,
      measuredAt: f.attributes.DATA_POMIARU === null ? null : WARSAW_DATE.format(f.attributes.DATA_POMIARU),
      unconfined: /swobodn/i.test(f.attributes.CHARAKTER_PUNKTU ?? ""),
    }))
}

export async function loadGroundwater(lat: number, lon: number): Promise<GroundwaterReading | null> {
  const rLat = Math.round(lat / 0.02) * 0.02
  const rLon = Math.round(lon / 0.02) * 0.02
  const { points } = await cached("pgi-mwp", `${rLat.toFixed(2)},${rLon.toFixed(2)}`, 30 * 86400, async () => ({ points: await monitoringPoints(rLat, rLon) }))
  const ranked = points
    .map(({ lat: pLat, lon: pLon, ...p }) => ({ ...p, distanceKm: distanceKm(lat, lon, pLat, pLon) }))
    .filter((p) => p.distanceKm <= RADIUS_KM)
    .sort((a, b) => Number(b.unconfined) - Number(a.unconfined) || a.distanceKm - b.distanceKm)
  return ranked[0] ?? null
}
