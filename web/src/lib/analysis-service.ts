import "server-only"
import { cropLabel } from "@/lib/crops"
import { morkaAnalysis } from "@/lib/mock/morka"
import type { Analysis, AnalysisError, AnalysisRequest } from "@/lib/types"
import { dateRange, isDateInRange, isValidParcelId, toIsoDate } from "@/lib/validation"
import { applySatellite, buildAnalysis } from "@/server/analysis/engine"
import { computeBalance } from "@/server/analysis/water-balance"
import { readCache, writeCache } from "@/server/cache"
import { loadHydro } from "@/server/sources/hydro"
import { loadDailyWeather } from "@/server/sources/meteo"
import { findParcelById } from "@/server/sources/parcel"
import { loadSatellite, type SatelliteResult } from "@/server/sources/satellite"
import { loadSoilCategory } from "@/server/sources/soil"
import { loadTerrain } from "@/server/sources/terrain"

const ENGINE_VERSION = "v6"
const WINDOW_DAYS = 45
const HISTORY_YEARS = 10
const SATELLITE_BUDGET_MS = Number(process.env.ROSA_SATELLITE_BUDGET_MS ?? 15000)
const SATELLITE_GRACE_MS = 400

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
  const started = performance.now()
  try {
    const value = await promise
    console.info(`[rosa] source ${label} ${Math.round(performance.now() - started)} ms`)
    return { value, failed: false }
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : ""
    console.warn(`[rosa] source ${label} failed after ${Math.round(performance.now() - started)} ms: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}${cause}`)
    return { value: null, failed: true }
  }
}

async function computeLive(req: AnalysisRequest, id: string): Promise<AnalysisResult> {
  const parcelStarted = performance.now()
  const parcel = await findParcelById(req.parcelId)
  console.info(`[rosa] source parcel ${Math.round(performance.now() - parcelStarted)} ms`)
  if (!parcel) {
    return { ok: false, error: { code: "parcel_not_found", message: "Nie znaleziono działki.", parcelId: req.parcelId } }
  }
  const sat = satelliteJob(id, () => loadSatellite(parcel.id, parcel.lat, parcel.lon, parcel.utmBbox, parcel.utmRings, req.date, SATELLITE_BUDGET_MS))
  const [weather, soil, terrain, hydro] = await Promise.all([
    settle("meteo", loadDailyWeather(parcel.lat, parcel.lon, req.date, HISTORY_YEARS, WINDOW_DAYS)),
    settle("soil", loadSoilCategory(parcel.x2180, parcel.y2180)),
    settle("terrain", loadTerrain(parcel.id, parcel.samplePoints2180)),
    settle("hydro", loadHydro(parcel.id)),
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
    hydro: hydro.value,
    failed: { soil: soil.failed, terrain: terrain.failed, hydro: hydro.failed },
    fetchedAt: toIsoDate(new Date()),
    historyYears: HISTORY_YEARS,
  })
  const early = await Promise.race([sat, new Promise<null>((r) => setTimeout(() => r(null), SATELLITE_GRACE_MS))])
  return { ok: true, analysis: early ? applySatellite(analysis, early.value, early.failed) : analysis }
}

type SatOutcome = { value: SatelliteResult | null; failed: boolean }
const satelliteJobs = new Map<string, Promise<SatOutcome>>()

function satelliteJob(id: string, load: () => Promise<SatelliteResult | null>): Promise<SatOutcome> {
  const running = satelliteJobs.get(id)
  if (running) return running
  const job = settle("satellite", load()).finally(() => setTimeout(() => satelliteJobs.delete(id), 60000))
  satelliteJobs.set(id, job)
  return job
}

function cacheKeyFor(id: string): string {
  return `${ENGINE_VERSION}:${id}`
}

export async function completeSatellite(req: AnalysisRequest): Promise<AnalysisResult> {
  const base = await runAnalysis(req)
  if (!base.ok) return base
  const status = base.analysis.sourceStatus.find((s) => s.key === "satelita")
  if (!status?.pending) return base
  const id = base.analysis.id
  const job =
    satelliteJobs.get(id) ??
    satelliteJob(id, async () => {
      const parcel = await findParcelById(req.parcelId)
      return parcel ? loadSatellite(parcel.id, parcel.lat, parcel.lon, parcel.utmBbox, parcel.utmRings, req.date, SATELLITE_BUDGET_MS) : null
    })
  const outcome = await job
  const analysis = applySatellite(base.analysis, outcome.value, outcome.failed)
  const isRecent = req.date >= toIsoDate(new Date(Date.now() - 6 * 86400000))
  void writeCache("analysis", cacheKeyFor(id), analysis, isRecent ? 3 * 3600 : 30 * 86400)
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
  const running = inflight.get(cacheKey)
  if (running) return running
  const job = cachedOrCompute(req, id, cacheKey).finally(() => inflight.delete(cacheKey))
  inflight.set(cacheKey, job)
  return job
}

const inflight = new Map<string, Promise<AnalysisResult>>()

async function cachedOrCompute(req: AnalysisRequest, id: string, cacheKey: string): Promise<AnalysisResult> {
  const hit = await readCache<Analysis>("analysis", cacheKey)
  if (hit) return { ok: true, analysis: hit }
  const started = performance.now()
  const result = await computeLive(req, id)
  console.info(`[rosa] analysis ${id} ${result.ok ? "ok" : result.error.code} in ${Math.round(performance.now() - started)} ms`)
  if (result.ok) {
    const isRecent = req.date >= toIsoDate(new Date(Date.now() - 6 * 86400000))
    void writeCache("analysis", cacheKey, result.analysis, isRecent ? 3 * 3600 : 30 * 86400)
  }
  return result
}
