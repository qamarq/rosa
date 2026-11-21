import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/server/db"
import { VOIVODESHIPS } from "@/lib/voivodeships"
import { parcelSelectionProblem, splitParcelIds } from "@/lib/validation"

export type ParcelRecord = {
  id: string
  obreb: string
  gmina: string
  wojewodztwo: string
  areaHa: number
  landUse: string | null
  lat: number
  lon: number
  x2180: number
  y2180: number
  geojson: string
  parcelIds: string[]
  samplePoints2180: [number, number][]
  utmBbox: Record<"32633" | "32634", [number, number, number, number]>
  utmRings: Record<"32633" | "32634", [number, number][][]>
}

type Row = {
  id: string
  obreb: string | null
  gmina: string | null
  area_m2: number
  land_use: string | null
  lat: number
  lon: number
  x: number
  y: number
  geojson: string
  pts: string | null
  b33: string
  b34: string
  g33: string
  g34: string
}

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("pl-PL")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pl-PL"))
}

function cleanGmina(value: string | null): string {
  if (!value) return ""
  const name = value.replace(/^(gmina miejska|gmina wiejska|gmina|miasto|gm\.|m\.)\s*/i, "").replace(/\s*-\s*(obszar wiejski|miasto|gmina|g|m|w)$/i, "").trim()
  return name === name.toLocaleUpperCase("pl-PL") ? titleCase(name) : name
}

function parseBox(text: string): [number, number, number, number] {
  const n = text.split(",").map(Number)
  return [n[0], n[1], n[2], n[3]]
}

function parseRings(geojson: string): [number, number][][] {
  const g = JSON.parse(geojson) as { type: string; coordinates: number[][][] | number[][][][] }
  const polys = g.type === "MultiPolygon" ? (g.coordinates as number[][][][]) : [g.coordinates as number[][][]]
  return polys.flatMap((p) => p.map((ring) => ring.map(([x, y]) => [x, y] as [number, number])))
}

function toRecord(row: Row, ids: string[] = [row.id]): ParcelRecord {
  const points = (row.pts ?? "")
    .split(",")
    .map((p) => p.trim().split(" ").map(Number))
    .filter((p): p is [number, number] => p.length === 2 && p.every(Number.isFinite))
  return {
    id: ids.join("+"),
    obreb: row.obreb ? titleCase(row.obreb) : "",
    gmina: cleanGmina(row.gmina),
    wojewodztwo: VOIVODESHIPS[row.id.slice(0, 2)] ?? "",
    areaHa: Math.round((row.area_m2 / 10000) * 100) / 100,
    landUse: row.land_use || null,
    lat: row.lat,
    lon: row.lon,
    x2180: row.x,
    y2180: row.y,
    geojson: row.geojson,
    parcelIds: ids,
    samplePoints2180: points,
    utmBbox: { "32633": parseBox(row.b33), "32634": parseBox(row.b34) },
    utmRings: { "32633": parseRings(row.g33), "32634": parseRings(row.g34) },
  }
}

function selectFor(points: number) {
  return sql`
  id_dzialki AS id,
  nazwa_obrebu AS obreb,
  nazwa_gminy AS gmina,
  ST_Area(geom) AS area_m2,
  klasouzytki_egib AS land_use,
  ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326)) AS lat,
  ST_X(ST_Transform(ST_PointOnSurface(geom), 4326)) AS lon,
  ST_X(ST_PointOnSurface(geom)) AS x,
  ST_Y(ST_PointOnSurface(geom)) AS y,
  ST_AsGeoJSON(ST_Transform(geom, 4326), 6) AS geojson,
  (SELECT string_agg(round(ST_X(d.geom)::numeric, 1) || ' ' || round(ST_Y(d.geom)::numeric, 1), ',')
     FROM ST_Dump(ST_GeneratePoints(geom, ${sql.raw(String(Math.round(points)))}, 7)) d) AS pts,
  (SELECT concat_ws(',', ST_XMin(b), ST_YMin(b), ST_XMax(b), ST_YMax(b)) FROM (SELECT ST_Transform(geom, 32633) AS b) x) AS b33,
  (SELECT concat_ws(',', ST_XMin(b), ST_YMin(b), ST_XMax(b), ST_YMax(b)) FROM (SELECT ST_Transform(geom, 32634) AS b) x) AS b34,
  ST_AsGeoJSON(ST_Transform(geom, 32633), 1) AS g33,
  ST_AsGeoJSON(ST_Transform(geom, 32634), 1) AS g34
`
}

const SELECT = selectFor(48)

export async function findParcelById(id: string): Promise<ParcelRecord | null> {
  const rows = await db().execute<Row>(sql`SELECT ${SELECT} FROM dzialki WHERE id_dzialki = ${id} LIMIT 1`)
  return rows[0] ? toRecord(rows[0]) : null
}

export async function findParcelByPoint(lat: number, lon: number): Promise<ParcelRecord | null> {
  const rows = await db().execute<Row>(sql`
    SELECT ${SELECT} FROM dzialki
    WHERE ST_Intersects(geom, ST_Transform(ST_SetSRID(ST_Point(${lon}, ${lat}), 4326), 2180))
    ORDER BY ST_Area(geom) ASC
    LIMIT 1`)
  return rows[0] ? toRecord(rows[0]) : null
}

export function fieldGeomSql(key: string) {
  const ids = splitParcelIds(key)
  return ids.length === 1
    ? sql`SELECT geom FROM dzialki WHERE id_dzialki = ${ids[0]} LIMIT 1`
    : sql`SELECT ST_Multi(ST_Union(geom, 0.01)) AS geom FROM dzialki WHERE id_dzialki IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
}

export type FieldLookup =
  | { ok: true; parcel: ParcelRecord }
  | { ok: false; code: "parcel_not_found"; parcelId: string; message: string }
  | { ok: false; code: "invalid_selection"; message: string }

const CONTIGUITY_M = 30

export async function findField(key: string): Promise<FieldLookup> {
  const ids = splitParcelIds(key)
  const problem = parcelSelectionProblem(ids)
  if (problem) return { ok: false, code: "invalid_selection", message: problem }
  if (ids.length === 1) {
    const parcel = await findParcelById(ids[0])
    return parcel ? { ok: true, parcel } : { ok: false, code: "parcel_not_found", parcelId: ids[0], message: "Nie znaleziono działki." }
  }
  const list = sql.join(ids.map((id) => sql`${id}`), sql`, `)
  const members = await db().execute<{ id: string; cluster: number }>(sql`
    SELECT id_dzialki AS id, ST_ClusterDBSCAN(geom, eps := ${CONTIGUITY_M}, minpoints := 1) OVER () AS cluster
    FROM dzialki WHERE id_dzialki IN (${list})`)
  const found = new Set(members.map((m) => m.id))
  const missing = ids.find((id) => !found.has(id))
  if (missing) return { ok: false, code: "parcel_not_found", parcelId: missing, message: `Nie znaleziono działki ${missing}.` }
  const sizes = new Map<number, number>()
  for (const m of members) sizes.set(m.cluster, (sizes.get(m.cluster) ?? 0) + 1)
  if (sizes.size > 1) {
    const main = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const far = members.filter((m) => m.cluster !== main).map((m) => m.id)
    return {
      ok: false,
      code: "invalid_selection",
      message: `Działki pola muszą do siebie przylegać (najwyżej ${CONTIGUITY_M} m przerwy). Za daleko od pozostałych: ${far.join(", ")}.`,
    }
  }
  const rows = await db().execute<Row>(sql`
    WITH sel AS (
      SELECT id_dzialki, nazwa_obrebu, nazwa_gminy, klasouzytki_egib, geom FROM dzialki WHERE id_dzialki IN (${list})
    ),
    top AS (SELECT * FROM sel ORDER BY ST_Area(geom) DESC LIMIT 1),
    u AS (SELECT ST_Multi(ST_Union(geom, 0.01)) AS geom FROM sel)
    SELECT ${selectFor(Math.min(96, 48 + 6 * (ids.length - 1)))}
    FROM (SELECT top.id_dzialki, top.nazwa_obrebu, top.nazwa_gminy, top.klasouzytki_egib, u.geom FROM top, u) AS dzialki`)
  if (!rows[0]) return { ok: false, code: "parcel_not_found", parcelId: ids[0], message: "Nie znaleziono działek." }
  return { ok: true, parcel: toRecord(rows[0], ids) }
}

