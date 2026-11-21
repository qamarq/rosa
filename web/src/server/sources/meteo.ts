import "server-only"
import { sql } from "drizzle-orm"
import { cached } from "@/server/cache"
import { db } from "@/server/db"
import { ETP_FACTOR } from "@/server/analysis/calibration"
import { fetchJson } from "@/server/http"

export type WeatherStation = { code: string; name: string; distanceKm: number; temperature: boolean }

export type DailySeries = {
  dates: string[]
  precip: number[]
  et0: number[]
  tmax: number[]
  stations: WeatherStation[]
  recent: RecentWeather
}

export type RecentCoverage = { from: string; to: string; days: number }
export type RecentWeather = { live: RecentCoverage | null; openMeteo: RecentCoverage | null }

type StationRow = { code: string; name: string; dist_m: number; has_temperature: number; lat: number }
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

type AggRow = { day: string; precip: number | null; tmax: number | null; tmin: number | null }
type DayValue = { day: string; precip: number; et0: number; tmax: number }
type StationSet = { used: StationRow[]; precipCodes: Set<string>; tempCodes: Set<string> }

async function pickStations(lat: number, lon: number): Promise<StationSet> {
  const stations = (await nearestStations(lat, lon)).filter((s) => s.dist_m <= MAX_DISTANCE_M)
  if (stations.length === 0) throw new Error("no IMGW stations nearby")
  const precipSet = [...stations].sort((a, b) => a.dist_m - b.dist_m).slice(0, PRECIP_STATIONS)
  const tempSet = stations.filter((s) => s.has_temperature === 1).sort((a, b) => a.dist_m - b.dist_m).slice(0, TEMP_STATIONS)
  const precipCodes = new Set(precipSet.map((s) => s.code))
  const tempCodes = new Set(tempSet.map((s) => s.code))
  return { used: stations.filter((s) => precipCodes.has(s.code) || tempCodes.has(s.code)), precipCodes, tempCodes }
}

async function weightedDays(table: "meteo_daily" | "meteo_daily_live", set: StationSet, lat: number, start: string, end: string): Promise<AggRow[]> {
  const values = sql.join(
    set.used.map((s) => sql`(${s.code}::text, ${1 / Math.max(1000, s.dist_m) ** 2}::float8, ${set.precipCodes.has(s.code)}::boolean, ${set.tempCodes.has(s.code)}::boolean)`),
    sql`, `,
  )
  return db().execute<AggRow>(sql`
    WITH st(code, w, is_p, is_t) AS (VALUES ${values})
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      sum(d.precip_mm * st.w) FILTER (WHERE st.is_p AND d.precip_mm IS NOT NULL) / nullif(sum(st.w) FILTER (WHERE st.is_p AND d.precip_mm IS NOT NULL), 0) AS precip,
      sum(d.tmax_c * st.w) FILTER (WHERE st.is_t AND d.tmax_c IS NOT NULL) / nullif(sum(st.w) FILTER (WHERE st.is_t AND d.tmax_c IS NOT NULL), 0) AS tmax,
      sum(d.tmin_c * st.w) FILTER (WHERE st.is_t AND d.tmin_c IS NOT NULL) / nullif(sum(st.w) FILTER (WHERE st.is_t AND d.tmin_c IS NOT NULL), 0) AS tmin
    FROM ${sql.identifier(table)} d JOIN st ON st.code = d.station_code
    WHERE d.day BETWEEN ${start}::date AND ${end}::date
    GROUP BY d.day
    ORDER BY d.day
  `)
}

function toDayValue(r: AggRow, lat: number): DayValue {
  const tx = r.tmax === null ? null : Number(r.tmax)
  const tn = r.tmin === null ? null : Number(r.tmin)
  return {
    day: r.day,
    precip: r.precip === null ? 0 : Number(r.precip),
    tmax: tx ?? Number.NaN,
    et0: tx !== null && tn !== null ? hargreaves(tx, tn, lat, r.day) * ETP_FACTOR : 0,
  }
}

function coverage(days: string[]): RecentCoverage | null {
  return days.length ? { from: days[0], to: days[days.length - 1], days: days.length } : null
}

export async function loadDailyWeather(lat: number, lon: number, analysisDate: string, yearsBack: number, windowDays: number): Promise<DailySeries> {
  const start = addDays(`${Number(analysisDate.slice(0, 4)) - yearsBack}${analysisDate.slice(4)}`, -windowDays - 5)
  const set = await pickStations(lat, lon)
  const days = (await weightedDays("meteo_daily", set, lat, start, analysisDate)).filter((r) => r.precip !== null || r.tmax !== null).map((r) => toDayValue(r, lat))
  const lastArchive = days[days.length - 1]?.day ?? start
  const liveDays: string[] = []
  const openMeteoDays: string[] = []

  if (lastArchive < analysisDate) {
    const live = (await weightedDays("meteo_daily_live", set, lat, addDays(lastArchive, 1), analysisDate)).filter((r) => r.precip !== null)
    for (const r of live) {
      days.push(toDayValue(r, lat))
      liveDays.push(r.day)
    }
    const covered = new Set(liveDays)
    let missingBeforeToday = false
    for (let d = addDays(lastArchive, 1); d < analysisDate; d = addDays(d, 1)) if (!covered.has(d)) missingBeforeToday = true
    if (missingBeforeToday) {
      const recent = await cached("meteo-recent", `${lat.toFixed(2)},${lon.toFixed(2)}:${new Date().toISOString().slice(0, 10)}`, 3 * 3600, () => recentDays(lat, lon))
      recent.time.forEach((d, i) => {
        if (d <= lastArchive || d > analysisDate || covered.has(d)) return
        days.push({ day: d, precip: recent.precipitation_sum[i] ?? 0, et0: recent.et0_fao_evapotranspiration[i] ?? 0, tmax: recent.temperature_2m_max[i] ?? Number.NaN })
        openMeteoDays.push(d)
      })
    }
    days.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  }

  return {
    dates: days.map((d) => d.day),
    precip: days.map((d) => d.precip),
    et0: days.map((d) => d.et0),
    tmax: days.map((d) => d.tmax),
    stations: set.used
      .sort((a, b) => a.dist_m - b.dist_m)
      .map((s) => ({ code: s.code, name: s.name, distanceKm: Math.round(s.dist_m / 100) / 10, temperature: set.tempCodes.has(s.code) })),
    recent: { live: coverage(liveDays), openMeteo: coverage(openMeteoDays) },
  }
}
