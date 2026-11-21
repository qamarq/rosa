import type { NextRequest } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/server/db"
import { VOIVODESHIPS } from "@/lib/voivodeships"

export type PlaceHit = {
  kind: "obreb" | "gmina" | "parcel"
  id: string
  label: string
  detail: string
  lon: number
  lat: number
  bbox?: [number, number, number, number]
}

type PlaceRow = {
  id: string
  kind: "obreb" | "gmina"
  name: string
  gmina: string | null
  woj: string
  lon: number
  lat: number
  min_lon: number
  min_lat: number
  max_lon: number
  max_lat: number
}

const FOLD: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" }

function norm(value: string): string {
  return value
    .toLocaleLowerCase("pl-PL")
    .replace(/[ąćęłńóśźż]/g, (ch) => FOLD[ch])
    .replace(/\s+/g, " ")
    .trim()
}

function cleanGmina(value: string | null): string {
  return (value ?? "").replace(/\s*-\s*(obszar wiejski|miasto|gmina|g|m|w)$/i, "").trim()
}

function toHit(row: PlaceRow): PlaceHit {
  const woj = VOIVODESHIPS[row.woj] ?? ""
  const gmina = cleanGmina(row.gmina)
  return {
    kind: row.kind,
    id: row.id,
    label: row.kind === "gmina" ? `Gmina ${cleanGmina(row.name)}` : row.name,
    detail: row.kind === "gmina" ? `woj. ${woj}` : [gmina && `gm. ${gmina}`, woj && `woj. ${woj}`].filter(Boolean).join(", "),
    lon: row.lon,
    lat: row.lat,
    bbox: [row.min_lon, row.min_lat, row.max_lon, row.max_lat],
  }
}

async function parcelHits(q: string): Promise<PlaceHit[]> {
  const byId = /^\d{4,6}_\d\.\d{1,4}\.\S+$/.test(q)
  const match = q.match(/^(.+?)\s+(?:dz\.?\s*|działka\s+)?([\w./-]*\d[\w./-]*)$/i)
  if (!byId && !match) return []
  const rows = byId
    ? await db().execute<{ id: string; obreb: string | null; gmina: string | null; lon: number; lat: number }>(sql`
        SELECT id_dzialki AS id, nazwa_obrebu AS obreb, nazwa_gminy AS gmina,
          ST_X(ST_Transform(ST_PointOnSurface(geom), 4326))::float8 AS lon, ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326))::float8 AS lat
        FROM dzialki WHERE id_dzialki = ${q} LIMIT 1`)
    : await db().execute<{ id: string; obreb: string | null; gmina: string | null; lon: number; lat: number }>(sql`
        SELECT d.id_dzialki AS id, d.nazwa_obrebu AS obreb, d.nazwa_gminy AS gmina,
          ST_X(ST_Transform(ST_PointOnSurface(d.geom), 4326))::float8 AS lon, ST_Y(ST_Transform(ST_PointOnSurface(d.geom), 4326))::float8 AS lat
        FROM (SELECT substr(id, 3) AS oid FROM rosa_place WHERE kind = 'obreb' AND name_norm = ${norm(match![1])}::text ORDER BY parcels DESC LIMIT 12) o
        JOIN dzialki d ON d.id_dzialki = o.oid || '.' || ${match![2]}::text
        LIMIT 6`)
  return [...rows].map((r) => ({
    kind: "parcel" as const,
    id: r.id,
    label: `Działka ${r.id.split(".").slice(2).join(".")}`,
    detail: [r.obreb && r.obreb.charAt(0) + r.obreb.slice(1).toLocaleLowerCase("pl-PL"), r.gmina && `gm. ${cleanGmina(r.gmina.replace(/^(gmina miejska|gmina wiejska|gmina|miasto)\s+/i, ""))}`].filter(Boolean).join(", "),
    lon: r.lon,
    lat: r.lat,
  }))
}

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  if (raw.length < 2) return Response.json({ results: [] })
  const q = norm(raw)
  try {
    const [parcels, places] = await Promise.all([
      parcelHits(raw),
      db().execute<PlaceRow>(sql`
        SELECT id, kind, name, gmina, woj, lon, lat, min_lon, min_lat, max_lon, max_lat
        FROM rosa_place WHERE name_norm LIKE ${q.replace(/[%_\\]/g, "") + "%"}::text
        ORDER BY (name_norm = ${q}::text) DESC, (kind = 'gmina') DESC, parcels DESC LIMIT 16`),
    ])
    const seen = new Set<string>()
    const hits: PlaceHit[] = []
    for (const hit of [...parcels, ...[...places].map(toHit)]) {
      const key = `${hit.label}|${hit.detail}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push(hit)
      if (hits.length >= 8) break
    }
    return Response.json({ results: hits }, { headers: { "Cache-Control": "public, max-age=3600" } })
  } catch (error) {
    console.error("places search failed", error)
    return Response.json({ code: "upstream_unavailable", results: [] }, { status: 503 })
  }
}
