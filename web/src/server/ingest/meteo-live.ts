import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/server/db"
import { fetchJson } from "@/server/http"

type ApiStation = {
  kod_stacji: string | null
  temperatura_powietrza: string | null
  temperatura_powietrza_data: string | null
  opad_10min: string | null
  opad_10min_data: string | null
}
type Sample = { code: string; ts: string; temp: number | null; precip: number | null }

const API_URL = "https://danepubliczne.imgw.pl/api/data/meteo"
const MAX_AGE_MS = 2 * 3600 * 1000
const MAX_AHEAD_MS = 15 * 60 * 1000
const MIN_PRECIP_SLOTS = Math.ceil(144 * 0.8)
const MIN_TEMP_SAMPLES = 12
const MIN_TEMP_BLOCKS = 6
const KEEP_DAYS = 10
const WARSAW_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" })

function parseUtc(text: string | null): Date | null {
  if (!text || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) return null
  const d = new Date(`${text.replace(" ", "T")}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function numberOrNull(text: string | null, min: number, max: number): number | null {
  if (text === null || text.trim() === "") return null
  const n = Number(text)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

export function warsawDate(at = new Date()): string {
  return WARSAW_DATE.format(at)
}

export function previousDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function ingestMeteoSamples(now = new Date()) {
  const stations = await fetchJson<ApiStation[]>(API_URL, 15000)
  const samples = new Map<string, Sample>()
  let stale = 0
  const add = (code: string, at: Date | null, field: "temp" | "precip", value: number | null) => {
    if (!at || value === null) return
    const age = now.getTime() - at.getTime()
    if (age > MAX_AGE_MS || age < -MAX_AHEAD_MS) {
      stale++
      return
    }
    const ts = at.toISOString()
    const key = `${code}|${ts}`
    const sample = samples.get(key) ?? { code, ts, temp: null, precip: null }
    sample[field] = value
    samples.set(key, sample)
  }
  for (const s of stations) {
    const code = s.kod_stacji?.trim() ?? ""
    if (!/^\d{9}$/.test(code)) continue
    add(code, parseUtc(s.temperatura_powietrza_data), "temp", numberOrNull(s.temperatura_powietrza, -60, 60))
    add(code, parseUtc(s.opad_10min_data), "precip", numberOrNull(s.opad_10min, 0, 200))
  }
  const rows = [...samples.values()]
  let inserted = 0
  if (rows.length > 0) {
    const values = sql.join(
      rows.map((r) => sql`(${r.code}::text, ${r.ts}::timestamptz, ${r.temp}::real, ${r.precip}::real)`),
      sql`, `,
    )
    const result = await db().execute<{ inserted: boolean }>(sql`
      INSERT INTO meteo_live_sample AS s (station_code, ts, temp_c, precip_10min_mm) VALUES ${values}
      ON CONFLICT (station_code, ts) DO UPDATE SET
        temp_c = coalesce(excluded.temp_c, s.temp_c),
        precip_10min_mm = coalesce(excluded.precip_10min_mm, s.precip_10min_mm)
      RETURNING (xmax = 0) AS inserted
    `)
    inserted = result.filter((r) => r.inserted).length
  }
  const summary = {
    stations: stations.length,
    samples: rows.length,
    inserted,
    temp: rows.filter((r) => r.temp !== null).length,
    precip: rows.filter((r) => r.precip !== null).length,
    stale,
  }
  console.info(`[rosa] meteo-live ingest ${JSON.stringify(summary)}`)
  return summary
}

export async function aggregateMeteoDay(day: string) {
  const rows = await db().transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM meteo_daily_live WHERE day = ${day}::date`)
    return tx.execute<{ stations: number; precip: number; temp: number }>(sql`
      WITH b AS (
        SELECT (${day}::date)::timestamp AT TIME ZONE 'Europe/Warsaw' AS t0,
               (${day}::date + 1)::timestamp AT TIME ZONE 'Europe/Warsaw' AS t1
      ),
      agg AS (
        SELECT m.station_code,
          count(m.precip_10min_mm)::int AS np,
          round(sum(m.precip_10min_mm)::numeric, 2)::real AS p,
          count(m.temp_c)::int AS nt,
          max(m.temp_c) AS tx,
          min(m.temp_c) AS tn,
          (count(DISTINCT floor(extract(hour FROM m.ts AT TIME ZONE 'Europe/Warsaw') / 3)) FILTER (WHERE m.temp_c IS NOT NULL))::int AS tb
        FROM meteo_live_sample m, b
        WHERE m.ts > b.t0 AND m.ts <= b.t1
        GROUP BY m.station_code
      ),
      ok AS (
        SELECT station_code, np, nt,
          CASE WHEN np >= ${MIN_PRECIP_SLOTS}::int THEN p END AS p,
          CASE WHEN nt >= ${MIN_TEMP_SAMPLES}::int AND tb >= ${MIN_TEMP_BLOCKS}::int THEN tx END AS tx,
          CASE WHEN nt >= ${MIN_TEMP_SAMPLES}::int AND tb >= ${MIN_TEMP_BLOCKS}::int THEN tn END AS tn
        FROM agg
      ),
      ins AS (
        INSERT INTO meteo_daily_live (station_code, day, precip_mm, tmax_c, tmin_c, samples_precip, samples_temp)
        SELECT station_code, ${day}::date, p, tx, tn, np, nt FROM ok WHERE p IS NOT NULL OR tx IS NOT NULL
        RETURNING precip_mm, tmax_c
      )
      SELECT count(*)::int AS stations, count(precip_mm)::int AS precip, count(tmax_c)::int AS temp FROM ins
    `)
  })
  const summary = { day, ...(rows[0] ?? { stations: 0, precip: 0, temp: 0 }) }
  console.info(`[rosa] meteo-live aggregate ${JSON.stringify(summary)}`)
  return summary
}

export async function pruneMeteoSamples() {
  const rows = await db().execute<{ n: number }>(sql`
    WITH d AS (DELETE FROM meteo_live_sample WHERE ts < now() - make_interval(days => ${KEEP_DAYS}::int) RETURNING 1)
    SELECT count(*)::int AS n FROM d
  `)
  const deleted = rows[0]?.n ?? 0
  console.info(`[rosa] meteo-live prune deleted=${deleted}`)
  return { deleted }
}
