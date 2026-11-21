import { sql } from "drizzle-orm"
import { db } from "@/server/db"

const MIN_Z = 13
const MAX_Z = 14

export async function GET(_request: Request, ctx: RouteContext<"/api/tiles/parcels/[z]/[x]/[y]">) {
  const { z: zs, x: xs, y: ys } = await ctx.params
  const z = Number(zs)
  const x = Number(xs)
  const y = Number(ys.replace(/\.mvt$/, ""))
  if (![z, x, y].every(Number.isInteger) || z < MIN_Z || z > MAX_Z || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    return new Response(null, { status: 404 })
  }
  try {
    const rows = await db().execute<{ mvt: Uint8Array | null }>(sql`
      WITH b AS (SELECT ST_TileEnvelope(${z}::int, ${x}::int, ${y}::int) AS e, ST_Transform(ST_TileEnvelope(${z}::int, ${x}::int, ${y}::int), 2180) AS e2)
      SELECT ST_AsMVT(t, 'parcels', 4096, 'g') AS mvt FROM (
        SELECT ST_AsMVTGeom(ST_Transform(d.geom, 3857), b.e, 4096, 64, true) AS g
        FROM dzialki d, b WHERE d.geom && b.e2
      ) t`)
    const mvt = rows[0]?.mvt
    return new Response(mvt && mvt.byteLength ? new Uint8Array(mvt) : null, {
      status: mvt && mvt.byteLength ? 200 : 204,
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return new Response(null, { status: 503 })
  }
}
