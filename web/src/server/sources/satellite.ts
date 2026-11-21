import "server-only"
import { fromUrl } from "geotiff"
import { cached } from "@/server/cache"
import { fetchJson } from "@/server/http"

export type SatelliteResult = {
  ndvi: number
  clearFraction: number
  imageDate: string
  sceneId: string
}

type StacItem = {
  id: string
  properties: { datetime: string; "eo:cloud_cover": number; "proj:epsg"?: number; "proj:code"?: string }
  assets: Record<string, { href: string }>
}

const STAC = "https://earth-search.aws.element84.com/v1/search"
const CLEAR_SCL = new Set([4, 5, 6, 7])

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function epsgOf(item: StacItem): string | null {
  const raw = item.properties["proj:epsg"] ?? item.properties["proj:code"]
  const code = String(raw ?? "").replace("EPSG:", "")
  return code === "32633" || code === "32634" ? code : null
}

type Window = { data: ArrayLike<number>; width: number; height: number; x0: number; y0: number; ox: number; oy: number; rx: number; ry: number }

function insideRings(x: number, y: number, rings: [number, number][][]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

async function readWindow(href: string, bbox: [number, number, number, number], signal: AbortSignal): Promise<Window> {
  const tiff = await fromUrl(href, { allowFullFile: false }, signal)
  const image = await tiff.getImage()
  const [ox, oy] = image.getOrigin()
  const [rx, ry] = image.getResolution()
  const x0 = Math.max(0, Math.floor((bbox[0] - ox) / rx))
  const x1 = Math.min(image.getWidth(), Math.ceil((bbox[2] - ox) / rx))
  const y0 = Math.max(0, Math.floor((bbox[3] - oy) / ry))
  const y1 = Math.min(image.getHeight(), Math.ceil((bbox[1] - oy) / ry))
  if (x1 <= x0 || y1 <= y0) throw new Error("parcel outside scene")
  const rasters = await image.readRasters({ window: [x0, y0, x1, y1], samples: [0], signal })
  const band = (rasters as unknown as ArrayLike<number>[])[0]
  return { data: band, width: x1 - x0, height: y1 - y0, x0, y0, ox, oy, rx, ry }
}

async function ndviForScene(item: StacItem, bbox: [number, number, number, number], rings: [number, number][][], signal: AbortSignal): Promise<{ ndvi: number; clear: number } | null> {
  const red = item.assets.red?.href
  const nir = item.assets.nir?.href
  const scl = item.assets.scl?.href
  if (!red || !nir || !scl) return null
  const [r, n, s] = await Promise.all([readWindow(red, bbox, signal), readWindow(nir, bbox, signal), readWindow(scl, bbox, signal)])
  let sum = 0
  let count = 0
  let total = 0
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const cx = r.ox + (r.x0 + x + 0.5) * r.rx
      const cy = r.oy + (r.y0 + y + 0.5) * r.ry
      if (!insideRings(cx, cy, rings)) continue
      total++
      const sx = Math.min(s.width - 1, Math.max(0, Math.floor((cx - s.ox) / s.rx) - s.x0))
      const sy = Math.min(s.height - 1, Math.max(0, Math.floor((cy - s.oy) / s.ry) - s.y0))
      if (!CLEAR_SCL.has(s.data[sy * s.width + sx])) continue
      const rv = r.data[y * r.width + x]
      const nv = n.data[y * n.width + x]
      if (rv + nv <= 0) continue
      sum += (nv - rv) / (nv + rv)
      count++
    }
  }
  if (count === 0 || total === 0) return { ndvi: Number.NaN, clear: 0 }
  return { ndvi: sum / count, clear: count / total }
}

export async function loadSatellite(
  parcelId: string,
  lat: number,
  lon: number,
  utmBbox: Record<"32633" | "32634", [number, number, number, number]>,
  utmRings: Record<"32633" | "32634", [number, number][][]>,
  analysisDate: string,
  budgetMs: number,
): Promise<SatelliteResult | null> {
  return cached("sentinel2-ndvi-mask", `${parcelId}:${analysisDate}`, 7 * 86400, async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), budgetMs)
    try {
      const search = await fetchJson<{ features: StacItem[] }>(STAC, Math.min(4000, budgetMs), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collections: ["sentinel-2-l2a"],
          intersects: { type: "Point", coordinates: [lon, lat] },
          datetime: `${addDays(analysisDate, -30)}T00:00:00Z/${analysisDate}T23:59:59Z`,
          query: { "eo:cloud_cover": { lt: 60 } },
          sortby: [{ field: "properties.datetime", direction: "desc" }],
          limit: 8,
        }),
      })
      for (const item of search.features.slice(0, 3)) {
        const epsg = epsgOf(item)
        if (!epsg) continue
        const zone = epsg as "32633" | "32634"
        const res = await ndviForScene(item, utmBbox[zone], utmRings[zone], controller.signal)
        if (res && res.clear >= 0.5 && Number.isFinite(res.ndvi)) {
          return { ndvi: Math.round(res.ndvi * 100) / 100, clearFraction: Math.round(res.clear * 100) / 100, imageDate: item.properties.datetime.slice(0, 10), sceneId: item.id }
        }
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  })
}
