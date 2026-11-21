import "server-only"
import { sql } from "drizzle-orm"
import type { ParcelScene, Ring } from "@/lib/scene3d"
import { cached } from "@/server/cache"
import { db } from "@/server/db"
import { fetchText } from "@/server/http"
import { fieldGeomSql } from "@/server/sources/parcel"
import { splitParcelIds } from "@/lib/validation"

const GRID = 33
const CHUNK = 110

type Base = { cx: number; cy: number; w: number; h: number; parcel: string }
type GeoRow = { kind: string; g: string }

function rings(geojson: string): Ring[] {
  const g = JSON.parse(geojson) as { type: string; coordinates: unknown }
  const round = (r: number[][]): Ring => r.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
  switch (g.type) {
    case "Polygon":
      return (g.coordinates as number[][][]).map(round)
    case "MultiPolygon":
      return (g.coordinates as number[][][][]).flatMap((p) => p.map(round))
    case "LineString":
      return [round(g.coordinates as number[][])]
    case "MultiLineString":
      return (g.coordinates as number[][][]).map(round)
    case "GeometryCollection":
      return []
    default:
      return []
  }
}

async function heights(cx: number, cy: number, half: number): Promise<number[]> {
  const step = (2 * half) / (GRID - 1)
  const pts: [number, number][] = []
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) pts.push([cx - half + c * step, cy + half - r * step])
  const chunks: [number, number][][] = []
  for (let i = 0; i < pts.length; i += CHUNK) chunks.push(pts.slice(i, i + CHUNK))
  const parts = await Promise.all(
    chunks.map((chunk) =>
      fetchText(
        "https://services.gugik.gov.pl/nmt/?" + new URLSearchParams({ request: "GetHByPointList", list: chunk.map(([x, y]) => `${y.toFixed(1)} ${x.toFixed(1)}`).join(",") }),
        8000,
      ).then((body) =>
        body
          .split(",")
          .map((t) => Number(t.trim().split(/\s+/)[2]))
          .slice(0, chunk.length),
      ),
    ),
  )
  const all = parts.flat()
  const sorted = all.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const ok = (v: number) => Number.isFinite(v) && v > -100 && !(v === 0 && median > 5)
  const valid = all.filter(ok)
  const fallback = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
  return all.map((v) => (ok(v) ? Math.round(v * 10) / 10 : Math.round(fallback * 10) / 10))
}

function downslope(hs: number[], step: number): ParcelScene["downslope"] {
  let sxx = 0, syy = 0, sxz = 0, syz = 0, sxy = 0
  const n = hs.length
  const mean = hs.reduce((a, b) => a + b, 0) / n
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = (c - (GRID - 1) / 2) * step
      const y = ((GRID - 1) / 2 - r) * step
      const z = hs[r * GRID + c] - mean
      sxx += x * x
      syy += y * y
      sxy += x * y
      sxz += x * z
      syz += y * z
    }
  }
  const det = sxx * syy - sxy * sxy
  const a = det ? (sxz * syy - syz * sxy) / det : 0
  const b = det ? (syz * sxx - sxz * sxy) / det : 0
  const len = Math.hypot(a, b) || 1
  return { x: Math.round((-a / len) * 1000) / 1000, y: Math.round((-b / len) * 1000) / 1000, slopePct: Math.round(Math.hypot(a, b) * 1000) / 10 }
}

export async function loadParcelScene(parcelId: string): Promise<ParcelScene | null> {
  const ids = splitParcelIds(parcelId)
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `)
  return cached("scene3d-v3", ids.join("+"), null, async () => {
    const base = await db().execute<Base>(sql`
      WITH p AS (${fieldGeomSql(parcelId)}),
      c AS (SELECT geom, ST_PointOnSurface(geom) AS pt FROM p)
      SELECT ST_X(pt) AS cx, ST_Y(pt) AS cy,
        ST_XMax(geom) - ST_XMin(geom) AS w, ST_YMax(geom) - ST_YMin(geom) AS h,
        ST_AsGeoJSON(ST_Translate(geom, -ST_X(pt), -ST_Y(pt)), 1) AS parcel
      FROM c`)
    const b = base[0]
    if (!b?.parcel) return null
    const cx = Number(b.cx), cy = Number(b.cy)
    const half = Math.max(160, Math.round(Math.max(Number(b.w), Number(b.h)) * 0.85))
    const [geo, hs] = await Promise.all([
      db().execute<GeoRow>(sql`
        WITH box AS (SELECT ST_MakeEnvelope(${cx - half}, ${cy - half}, ${cx + half}, ${cy + half}, 2180) AS g)
        (SELECT 'neighbor' AS kind, ST_AsGeoJSON(ST_Translate(ST_SimplifyPreserveTopology(ST_Intersection(d.geom, box.g), 1.5), ${-cx}, ${-cy}), 1) AS g
           FROM dzialki d, box WHERE d.geom && box.g AND d.id_dzialki NOT IN (${idList}) LIMIT 600)
        ${ids.length > 1 ? sql`UNION ALL (SELECT 'part', ST_AsGeoJSON(ST_Translate(d.geom, ${-cx}, ${-cy}), 1) FROM dzialki d WHERE d.id_dzialki IN (${idList}))` : sql``}
        UNION ALL
        (SELECT h.kind, ST_AsGeoJSON(ST_Translate(ST_SimplifyPreserveTopology(ST_Intersection(h.geom, box.g), 1), ${-cx}, ${-cy}), 1)
           FROM hydro_feature h, box WHERE h.geom && box.g LIMIT 400)`),
      heights(cx, cy, half),
    ])
    const neighbors: Ring[] = []
    const parts: Ring[] = []
    const waterLines: ParcelScene["waterLines"] = []
    const waterAreas: Ring[] = []
    for (const row of geo) {
      const rs = rings(row.g)
      if (row.kind === "part") parts.push(...rs.filter((r) => r.length >= 4))
      else if (row.kind === "neighbor") neighbors.push(...rs.filter((r) => r.length >= 4).map((r) => r))
      else if (row.kind === "woda") waterAreas.push(...rs.filter((r) => r.length >= 4))
      else waterLines.push(...rs.filter((r) => r.length >= 2).map((points) => ({ kind: row.kind as "rów" | "ciek" | "kanał", points })))
    }
    const step = (2 * half) / (GRID - 1)
    return {
      parcelId: ids.join("+"),
      halfExtentM: half,
      grid: { size: GRID, stepM: Math.round(step * 100) / 100, heights: hs },
      minHeightM: Math.min(...hs),
      maxHeightM: Math.max(...hs),
      parcel: rings(b.parcel),
      ...(ids.length > 1 ? { parts, parcelIds: ids } : {}),
      neighbors,
      waterLines,
      waterAreas,
      downslope: downslope(hs, step),
      center2180: [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10],
    }
  })
}
