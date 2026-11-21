import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/server/db"

const VOIVODESHIPS: Record<string, string> = {
  "02": "dolnośląskie",
  "04": "kujawsko-pomorskie",
  "06": "lubelskie",
  "08": "lubuskie",
  "10": "łódzkie",
  "12": "małopolskie",
  "14": "mazowieckie",
  "16": "opolskie",
  "18": "podkarpackie",
  "20": "podlaskie",
  "22": "pomorskie",
  "24": "śląskie",
  "26": "świętokrzyskie",
  "28": "warmińsko-mazurskie",
  "30": "wielkopolskie",
  "32": "zachodniopomorskie",
}

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
  return value.replace(/^(gmina|miasto)\s+/i, "").trim()
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

function toRecord(row: Row): ParcelRecord {
  const points = (row.pts ?? "")
    .split(",")
    .map((p) => p.trim().split(" ").map(Number))
    .filter((p): p is [number, number] => p.length === 2 && p.every(Number.isFinite))
  return {
    id: row.id,
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
    samplePoints2180: points,
    utmBbox: { "32633": parseBox(row.b33), "32634": parseBox(row.b34) },
    utmRings: { "32633": parseRings(row.g33), "32634": parseRings(row.g34) },
  }
}

const SELECT = sql`
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
     FROM ST_Dump(ST_GeneratePoints(geom, 48, 7)) d) AS pts,
  (SELECT concat_ws(',', ST_XMin(b), ST_YMin(b), ST_XMax(b), ST_YMax(b)) FROM (SELECT ST_Transform(geom, 32633) AS b) x) AS b33,
  (SELECT concat_ws(',', ST_XMin(b), ST_YMin(b), ST_XMax(b), ST_YMax(b)) FROM (SELECT ST_Transform(geom, 32634) AS b) x) AS b34,
  ST_AsGeoJSON(ST_Transform(geom, 32633), 1) AS g33,
  ST_AsGeoJSON(ST_Transform(geom, 32634), 1) AS g34
`

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
