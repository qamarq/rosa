import "server-only"
import { sql } from "drizzle-orm"
import { toIsoDate } from "@/lib/validation"
import { cached } from "@/server/cache"
import { db } from "@/server/db"
import { distanceKm } from "@/server/geo"
import { fetchJson } from "@/server/http"

export type RiverReading = {
  gauge: string
  river: string | null
  distanceKm: number
  day: string
  levelCm: number
  percentile: number
  sampleYears: number
  live: boolean
}

export type RiverSummary = { reading: RiverReading | null; gaugesNearby: number; archiveEnd: string | null }

type GaugeRow = {
  code: string
  name: string
  river: string | null
  lat: number
  lon: number
  cur_day: string | null
  cur_level: number | null
  archive_end: string | null
}
type StatsRow = { n: number; below: number; ties: number; years: number }
type LiveRow = { stan_wody: string | null; stan_wody_data_pomiaru: string | null }
type Cached = { reading: (RiverReading & { lat: number; lon: number }) | null; gaugesNearby: number; archiveEnd: string | null }

const RADIUS_M = 25000
const MAX_TRIES = 3
const MIN_SAMPLE = 60

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function liveLevel(code: string, date: string): Promise<{ day: string; levelCm: number } | null> {
  const rows = await fetchJson<LiveRow[]>(`https://danepubliczne.imgw.pl/api/data/hydro/id/${encodeURIComponent(code)}`, 4000)
  const row = rows[0]
  const level = row?.stan_wody == null ? Number.NaN : Number(row.stan_wody)
  const day = row?.stan_wody_data_pomiaru?.slice(0, 10) ?? ""
  if (!Number.isFinite(level) || day < addDays(date, -1) || day > date) return null
  return { day, levelCm: level }
}

async function seasonStats(code: string, date: string, levelCm: number): Promise<StatsRow> {
  const rows = await db().execute<StatsRow>(sql`
    SELECT count(*)::int AS n,
      count(*) FILTER (WHERE d.level_cm < ${levelCm}::real)::int AS below,
      count(*) FILTER (WHERE d.level_cm = ${levelCm}::real)::int AS ties,
      count(DISTINCT k)::int AS years
    FROM generate_series(1, 10) AS k
    JOIN hydro_gauge_daily d ON d.code = ${code}::text
      AND d.day BETWEEN (${date}::date - make_interval(years => k))::date - 15 AND (${date}::date - make_interval(years => k))::date + 15
    WHERE d.level_cm IS NOT NULL
  `)
  return rows[0] ?? { n: 0, below: 0, ties: 0, years: 0 }
}

async function compute(lat: number, lon: number, date: string): Promise<Cached> {
  const gauges = await db().execute<GaugeRow>(sql`
    WITH p AS (SELECT ST_SetSRID(ST_MakePoint(${lon}::float8, ${lat}::float8), 4326) AS g),
    near AS (
      SELECT h.code, h.name, h.river, h.lat, h.lon, ST_DistanceSphere(h.geom, p.g) AS dist_m
      FROM hydro_gauge h, p ORDER BY h.geom <-> p.g LIMIT 10
    )
    SELECT n.code, n.name, n.river, n.lat, n.lon, to_char(c.day, 'YYYY-MM-DD') AS cur_day, c.level_cm AS cur_level,
      (SELECT to_char(max(day), 'YYYY-MM-DD') FROM hydro_gauge_daily) AS archive_end
    FROM near n
    LEFT JOIN LATERAL (
      SELECT day, level_cm FROM hydro_gauge_daily d
      WHERE d.code = n.code AND d.day BETWEEN ${date}::date - 3 AND ${date}::date AND d.level_cm IS NOT NULL
      ORDER BY d.day DESC LIMIT 1
    ) c ON true
    WHERE n.dist_m <= ${RADIUS_M}::float8
    ORDER BY n.dist_m
  `)
  const archiveEnd = gauges[0]?.archive_end ?? null
  const live = archiveEnd !== null && date > archiveEnd && date >= toIsoDate(new Date(Date.now() - 86400000))
  let tries = 0
  for (const g of gauges) {
    if (tries >= MAX_TRIES) break
    const current = live ? await liveLevel(g.code, date).catch(() => null) : g.cur_level === null ? null : { day: g.cur_day!, levelCm: Number(g.cur_level) }
    if (!current) continue
    tries++
    const s = await seasonStats(g.code, date, current.levelCm)
    if (s.n < MIN_SAMPLE) continue
    return {
      reading: {
        gauge: g.name,
        river: g.river,
        lat: Number(g.lat),
        lon: Number(g.lon),
        distanceKm: 0,
        day: current.day,
        levelCm: current.levelCm,
        percentile: Math.round(((s.below + s.ties / 2) / s.n) * 100) / 100,
        sampleYears: s.years,
        live,
      },
      gaugesNearby: gauges.length,
      archiveEnd,
    }
  }
  return { reading: null, gaugesNearby: gauges.length, archiveEnd }
}

export async function loadRivers(lat: number, lon: number, date: string): Promise<RiverSummary> {
  const recent = date >= toIsoDate(new Date(Date.now() - 6 * 86400000))
  const rLat = Number(lat.toFixed(2))
  const rLon = Number(lon.toFixed(2))
  const out = await cached("imgw-rivers", `${rLat},${rLon}:${date}`, recent ? 3 * 3600 : 30 * 86400, () => compute(rLat, rLon, date))
  if (!out.reading) return { reading: null, gaugesNearby: out.gaugesNearby, archiveEnd: out.archiveEnd }
  const { lat: gLat, lon: gLon, ...reading } = out.reading
  return { reading: { ...reading, distanceKm: distanceKm(lat, lon, gLat, gLon) }, gaugesNearby: out.gaugesNearby, archiveEnd: out.archiveEnd }
}
