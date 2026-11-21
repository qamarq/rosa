import "server-only"
import { cropLabel } from "@/lib/crops"
import { morkaAnalysis } from "@/lib/mock/morka"
import type { Analysis, AnalysisError, AnalysisRequest } from "@/lib/types"
import { dateRange, isDateInRange, isValidParcelId, toIsoDate } from "@/lib/validation"
import { buildAnalysis } from "@/server/analysis/engine"
import { computeBalance } from "@/server/analysis/water-balance"
import { readCache, writeCache } from "@/server/cache"
import { loadDailyWeather } from "@/server/sources/meteo"
import { findParcelById } from "@/server/sources/parcel"
import { loadSoilCategory } from "@/server/sources/soil"
import { loadTerrain } from "@/server/sources/terrain"

const ENGINE_VERSION = "v2"
const WINDOW_DAYS = 45
const HISTORY_YEARS = 10

export type AnalysisResult = { ok: true; analysis: Analysis } | { ok: false; error: AnalysisError }

export function analysisIdFor(req: AnalysisRequest): string {
  return [req.parcelId, req.crop, req.date].map(encodeURIComponent).join("~")
}

export function requestFromId(id: string): AnalysisRequest | null {
  const parts = decodeURIComponent(id).split("~")
  if (parts.length !== 3) return null
  const [parcelId, crop, date] = parts
  return { parcelId, crop: crop as AnalysisRequest["crop"], date }
}

function mockMode(): boolean {
  return !process.env.DATABASE_URL || process.env.ROSA_DATA_MODE === "mock"
}

function mockAnalysis(req: AnalysisRequest): AnalysisResult {
  if (req.parcelId.endsWith(".9999")) {
    return { ok: false, error: { code: "parcel_not_found", message: "Nie znaleziono działki.", parcelId: req.parcelId } }
  }
  return {
    ok: true,
    analysis: {
      ...morkaAnalysis,
      id: analysisIdFor(req),
      request: req,
      cropLabel: cropLabel(req.crop),
      parcel: { ...morkaAnalysis.parcel, id: req.parcelId },
    },
  }
}

async function settle<T>(label: string, promise: Promise<T>): Promise<{ value: T | null; failed: boolean }> {
  try {
    return { value: await promise, failed: false }
  } catch (error) {
    console.warn(`[rosa] source ${label} failed: ${error instanceof Error ? error.message : String(error)}`)
    return { value: null, failed: true }
  }
}

async function computeLive(req: AnalysisRequest, id: string): Promise<AnalysisResult> {
  const parcel = await findParcelById(req.parcelId)
  if (!parcel) {
    return { ok: false, error: { code: "parcel_not_found", message: "Nie znaleziono działki.", parcelId: req.parcelId } }
  }
  const [weather, soil, terrain] = await Promise.all([
    settle("meteo", loadDailyWeather(parcel.lat, parcel.lon, req.date, HISTORY_YEARS, WINDOW_DAYS)),
    settle("soil", loadSoilCategory(parcel.x2180, parcel.y2180)),
    settle("terrain", loadTerrain(parcel.id, parcel.samplePoints2180)),
  ])
  if (!weather.value) {
    return { ok: false, error: { code: "upstream_unavailable", message: "Dane pogodowe są chwilowo niedostępne." } }
  }
  const balance = computeBalance(weather.value, req.date, WINDOW_DAYS, HISTORY_YEARS)
  const analysis = buildAnalysis({
    id,
    request: req,
    parcel,
    balance,
    weather: { stations: weather.value.stations, recentFrom: weather.value.recentFrom },
    soil: soil.value,
    terrain: terrain.value,
    failed: { soil: soil.failed, terrain: terrain.failed },
    fetchedAt: toIsoDate(new Date()),
    historyYears: HISTORY_YEARS,
  })
  return { ok: true, analysis }
}

export async function runAnalysis(req: AnalysisRequest): Promise<AnalysisResult> {
  if (!isValidParcelId(req.parcelId)) {
    return { ok: false, error: { code: "invalid_parcel_id", message: "Nieprawidłowy numer działki." } }
  }
  if (!isDateInRange(req.date)) {
    const { min, max } = dateRange()
    return { ok: false, error: { code: "date_out_of_range", message: "Data spoza zakresu.", min, max } }
  }
  if (mockMode()) return mockAnalysis(req)

  const id = analysisIdFor(req)
  const cacheKey = `${ENGINE_VERSION}:${id}`
  const hit = await readCache<Analysis>("analysis", cacheKey)
  if (hit) return { ok: true, analysis: hit }

  const started = performance.now()
  const result = await computeLive(req, id)
  console.info(`[rosa] analysis ${id} ${result.ok ? "ok" : result.error.code} in ${Math.round(performance.now() - started)} ms`)
  if (result.ok) {
    const isToday = req.date >= toIsoDate(new Date(Date.now() - 6 * 86400000))
    await writeCache("analysis", cacheKey, result.analysis, isToday ? 3 * 3600 : 30 * 86400)
  }
  return result
}
