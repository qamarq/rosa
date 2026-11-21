import "server-only"
import { sql } from "drizzle-orm"
import { cached } from "@/server/cache"
import { db } from "@/server/db"

export type HydroFeature = { kind: "rów" | "ciek" | "kanał" | "woda"; subkind: string | null; name: string | null; distanceM: number; direction: string }

export type HydroSummary = {
  features: HydroFeature[]
  ditchM: number | null
  streamM: number | null
  waterBodyM: number | null
  ditchSide: string | null
}

type Row = { kind: HydroFeature["kind"]; subkind: string | null; name: string | null; dist: number; az: number | null }

const DIRECTIONS = ["północnej", "północno-wschodniej", "wschodniej", "południowo-wschodniej", "południowej", "południowo-zachodniej", "zachodniej", "północno-zachodniej"]

function side(azimuthDeg: number | null): string {
  if (azimuthDeg === null || !Number.isFinite(azimuthDeg)) return ""
  return DIRECTIONS[Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8]
}

export async function loadHydro(parcelId: string): Promise<HydroSummary> {
  return cached("bdot-hydro", parcelId, 30 * 86400, async () => {
    const rows = await db().execute<Row>(sql`
      WITH p AS (SELECT geom, ST_PointOnSurface(geom) AS c FROM dzialki WHERE id_dzialki = ${parcelId} LIMIT 1)
      SELECT DISTINCT ON (h.kind) h.kind, h.subkind, h.name,
        ST_Distance(h.geom, p.geom) AS dist,
        degrees(ST_Azimuth(p.c, ST_ClosestPoint(h.geom, p.c))) AS az
      FROM hydro_feature h, p
      WHERE ST_DWithin(h.geom, p.geom, 500)
      ORDER BY h.kind, ST_Distance(h.geom, p.geom)
    `)
    const features = rows
      .map((r) => ({ kind: r.kind, subkind: r.subkind, name: r.name, distanceM: Math.round(Number(r.dist)), direction: side(r.az === null ? null : Number(r.az)) }))
      .sort((a, b) => a.distanceM - b.distanceM)
    const nearest = (k: HydroFeature["kind"][]) => features.find((f) => k.includes(f.kind)) ?? null
    const ditch = nearest(["rów", "kanał"])
    return {
      features,
      ditchM: ditch?.distanceM ?? null,
      streamM: nearest(["ciek"])?.distanceM ?? null,
      waterBodyM: nearest(["woda"])?.distanceM ?? null,
      ditchSide: ditch?.direction || null,
    }
  })
}
