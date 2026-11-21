import "server-only"
import { cached } from "@/server/cache"
import { fetchJson } from "@/server/http"

export type DailySeries = {
  dates: string[]
  precip: number[]
  et0: number[]
  tmax: number[]
  soilTop: (number | null)[]
  soilDeep: (number | null)[]
  gridLat: number
  gridLon: number
}

type OpenMeteoResponse = {
  latitude: number
  longitude: number
  daily: {
    time: string[]
    precipitation_sum: (number | null)[]
    et0_fao_evapotranspiration: (number | null)[]
    temperature_2m_max: (number | null)[]
    soil_moisture_0_to_7cm_mean?: (number | null)[]
    soil_moisture_28_to_100cm_mean?: (number | null)[]
  }
}

const DAILY = [
  "precipitation_sum",
  "et0_fao_evapotranspiration",
  "temperature_2m_max",
  "soil_moisture_0_to_7cm_mean",
  "soil_moisture_28_to_100cm_mean",
].join(",")

const ARCHIVE_LAG_DAYS = 6

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toSeries(r: OpenMeteoResponse): DailySeries {
  const d = r.daily
  return {
    dates: d.time,
    precip: d.precipitation_sum.map((v) => v ?? 0),
    et0: d.et0_fao_evapotranspiration.map((v) => v ?? 0),
    tmax: d.temperature_2m_max.map((v) => v ?? Number.NaN),
    soilTop: d.soil_moisture_0_to_7cm_mean ?? d.time.map(() => null),
    soilDeep: d.soil_moisture_28_to_100cm_mean ?? d.time.map(() => null),
    gridLat: r.latitude,
    gridLon: r.longitude,
  }
}

function merge(a: DailySeries, b: DailySeries): DailySeries {
  const last = a.dates[a.dates.length - 1]
  const from = b.dates.findIndex((d) => d > last)
  if (from < 0) return a
  const pick = <T,>(x: T[]) => x.slice(from)
  return {
    ...a,
    dates: [...a.dates, ...pick(b.dates)],
    precip: [...a.precip, ...pick(b.precip)],
    et0: [...a.et0, ...pick(b.et0)],
    tmax: [...a.tmax, ...pick(b.tmax)],
    soilTop: [...a.soilTop, ...pick(b.soilTop)],
    soilDeep: [...a.soilDeep, ...pick(b.soilDeep)],
  }
}

async function archive(lat: number, lon: number, start: string, end: string): Promise<DailySeries> {
  const url =
    "https://archive-api.open-meteo.com/v1/archive?" +
    new URLSearchParams({ latitude: String(lat), longitude: String(lon), start_date: start, end_date: end, daily: DAILY, timezone: "Europe/Warsaw" })
  return toSeries(await fetchJson<OpenMeteoResponse>(url, 8000))
}

async function recent(lat: number, lon: number): Promise<DailySeries> {
  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      past_days: "31",
      forecast_days: "1",
      daily: "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max",
      timezone: "Europe/Warsaw",
    })
  return toSeries(await fetchJson<OpenMeteoResponse>(url, 6000))
}

export async function loadDailyWeather(lat: number, lon: number, analysisDate: string, yearsBack: number, windowDays: number): Promise<DailySeries> {
  const rLat = Math.round(lat * 10) / 10
  const rLon = Math.round(lon * 10) / 10
  const start = addDays(`${Number(analysisDate.slice(0, 4)) - yearsBack}${analysisDate.slice(4)}`, -windowDays - 5)
  const archiveEnd = [analysisDate, addDays(todayIso(), -ARCHIVE_LAG_DAYS)].sort()[0]
  const isRecent = analysisDate > archiveEnd
  const key = `${rLat},${rLon}:${start}:${archiveEnd}`
  const base = await cached("meteo-archive", key, isRecent ? 6 * 3600 : null, () => archive(rLat, rLon, start, archiveEnd))
  if (!isRecent) return base
  const tail = await cached("meteo-recent", `${rLat},${rLon}:${todayIso()}`, 3 * 3600, () => recent(rLat, rLon))
  const merged = merge(base, tail)
  const cut = merged.dates.findIndex((d) => d > analysisDate)
  if (cut < 0) return merged
  const take = <T,>(x: T[]) => x.slice(0, cut)
  return { ...merged, dates: take(merged.dates), precip: take(merged.precip), et0: take(merged.et0), tmax: take(merged.tmax), soilTop: take(merged.soilTop), soilDeep: take(merged.soilDeep) }
}
