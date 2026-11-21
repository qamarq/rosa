import "server-only"
import { sql } from "drizzle-orm"
import { cached } from "@/server/cache"
import { db } from "@/server/db"
import { fetchJson } from "@/server/http"

export type WeatherStation = { code: string; name: string; distanceKm: number; temperature: boolean }

export type DailySeries = {
  dates: string[]
  precip: number[]
  et0: number[]
  tmax: number[]
  stations: WeatherStation[]
  recentFrom: string | null
}

type StationRow = { code: string; name: string; dist_m: number; has_temperature: number; lat: number }
type DayRow = { station_code: string; day: string; precip_mm: number | null; tmax_c: number | null; tmin_c: number | null }
type OpenMeteoForecast = { daily: { time: string[]; precipitation_sum: (number | null)[]; et0_fao_evapotranspiration: (number | null)[]; temperature_2m_max: (number | null)[] } }

const PRECIP_STATIONS = 5
const TEMP_STATIONS = 4
const MAX_DISTANCE_M = 80000

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayOfYear(iso: string): number {
  const d = new Date(iso + "T00:00:00Z")
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000)
}

function extraterrestrialRadiationMm(latDeg: number, iso: string): number {
  const phi = (latDeg * Math.PI) / 180
  const j = dayOfYear(iso)
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * j)
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * j - 1.39)
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))))
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  return 0.408 * ra
}

function hargreaves(tmax: number, tmin: number, latDeg: number, iso: string): number {
  const tmean = (tmax + tmin) / 2
  const range = Math.max(0, tmax - tmin)
  return Math.max(0, 0.0023 * extraterrestrialRadiationMm(latDeg, iso) * (tmean + 17.8) * Math.sqrt(range))
}

function idw(values: { v: number | null; w: number }[]): number | null {
  let num = 0
  let den = 0
  for (const { v, w } of values) {
    if (v === null || !Number.isFinite(v)) continue
    num += v * w
    den += w
  }
  return den > 0 ? num / den : null
}

async function nearestStations(lat: number, lon: number): Promise<StationRow[]> {
  return db().execute<StationRow>(sql`
    WITH p AS (SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS g)
    (SELECT code, name, has_temperature, lat, ST_DistanceSphere(geom, p.g) AS dist_m
       FROM meteo_station, p ORDER BY geom <-> p.g LIMIT ${PRECIP_STATIONS + 3})
    UNION
    (SELECT code, name, has_temperature, lat, ST_DistanceSphere(geom, p.g) AS dist_m
       FROM meteo_station, p WHERE has_temperature = 1 ORDER BY geom <-> p.g LIMIT ${TEMP_STATIONS})
  `)
}

async function recentDays(lat: number, lon: number): Promise<OpenMeteoForecast["daily"]> {
  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lon.toFixed(2),
      past_days: "92",
      forecast_days: "1",
      daily: "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max",
      timezone: "Europe/Warsaw",
    })
  return (await fetchJson<OpenMeteoForecast>(url, 6000)).daily
}

async function stationSeries(lat: number, lon: number, start: string, end: string): Promise<DailySeries> {
  const stations = (await nearestStations(lat, lon)).filter((s) => s.dist_m <= MAX_DISTANCE_M)
  if (stations.length === 0) throw new Error("no IMGW stations nearby")
  const rows = await db().execute<DayRow>(sql`
    SELECT station_code, to_char(day, 'YYYY-MM-DD') AS day, precip_mm, tmax_c, tmin_c
    FROM meteo_daily
    WHERE station_code IN (${sql.join(stations.map((s) => sql`${s.code}`), sql`, `)})
      AND day BETWEEN ${start} AND ${end}
  `)
  const byDay = new Map<string, DayRow[]>()
  for (const r of rows) {
    const list = byDay.get(r.day)
    if (list) list.push(r)
    else byDay.set(r.day, [r])
  }
  const precipSet = [...stations].sort((a, b) => a.dist_m - b.dist_m).slice(0, PRECIP_STATIONS)
  const tempSet = stations.filter((s) => s.has_temperature === 1).sort((a, b) => a.dist_m - b.dist_m).slice(0, TEMP_STATIONS)
  const weight = new Map(stations.map((s) => [s.code, 1 / Math.max(1000, s.dist_m) ** 2]))
  const precipCodes = new Set(precipSet.map((s) => s.code))
  const tempCodes = new Set(tempSet.map((s) => s.code))

  const dates: string[] = []
  const precip: number[] = []
  const et0: number[] = []
  const tmax: number[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const list = byDay.get(d) ?? []
    const p = idw(list.filter((r) => precipCodes.has(r.station_code)).map((r) => ({ v: r.precip_mm, w: weight.get(r.station_code)! })))
    const tx = idw(list.filter((r) => tempCodes.has(r.station_code)).map((r) => ({ v: r.tmax_c, w: weight.get(r.station_code)! })))
    const tn = idw(list.filter((r) => tempCodes.has(r.station_code)).map((r) => ({ v: r.tmin_c, w: weight.get(r.station_code)! })))
    if (p === null && tx === null) continue
    dates.push(d)
    precip.push(p ?? 0)
    tmax.push(tx ?? Number.NaN)
    et0.push(tx !== null && tn !== null ? hargreaves(tx, tn, lat, d) : 0)
  }
  const used = new Set([...precipCodes, ...tempCodes])
  return {
    dates,
    precip,
    et0,
    tmax,
    stations: stations
      .filter((s) => used.has(s.code))
      .sort((a, b) => a.dist_m - b.dist_m)
      .map((s) => ({ code: s.code, name: s.name, distanceKm: Math.round(s.dist_m / 100) / 10, temperature: tempCodes.has(s.code) })),
    recentFrom: null,
  }
}

export async function loadDailyWeather(lat: number, lon: number, analysisDate: string, yearsBack: number, windowDays: number): Promise<DailySeries> {
  const start = addDays(`${Number(analysisDate.slice(0, 4)) - yearsBack}${analysisDate.slice(4)}`, -windowDays - 5)
  const base = await stationSeries(lat, lon, start, analysisDate)
  const lastStation = base.dates[base.dates.length - 1] ?? start
  if (lastStation >= addDays(analysisDate, -1)) return base

  const recent = await cached("meteo-recent", `${lat.toFixed(2)},${lon.toFixed(2)}:${new Date().toISOString().slice(0, 10)}`, 3 * 3600, () => recentDays(lat, lon))
  const out = { ...base, dates: [...base.dates], precip: [...base.precip], et0: [...base.et0], tmax: [...base.tmax], recentFrom: null as string | null }
  recent.time.forEach((d, i) => {
    if (d <= lastStation || d > analysisDate) return
    out.dates.push(d)
    out.precip.push(recent.precipitation_sum[i] ?? 0)
    out.et0.push(recent.et0_fao_evapotranspiration[i] ?? 0)
    out.tmax.push(recent.temperature_2m_max[i] ?? Number.NaN)
    if (!out.recentFrom) out.recentFrom = d
  })
  return out
}
