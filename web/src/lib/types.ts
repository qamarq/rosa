export type CropId = "pszenica" | "kukurydza" | "rzepak" | "ziemniaki" | "buraki" | "laka"

export type SceneMode = "hero" | "susza" | "zastawka" | "miedzyplon" | "nawadnianie"

export type DroughtLevel = 1 | 2 | 3 | 4 | 5

export type RecommendationGroup = "woda" | "gleba" | "irr"

export type SourceKey = "pogoda" | "satelita" | "gleba" | "teren" | "hydrologia"

export type ConfidenceLevel = "niska" | "srednia" | "wysoka"

export interface AnalysisRequest {
  parcelId: string
  crop: CropId
  date: string
}

export interface Parcel {
  id: string
  obreb: string
  gmina: string
  wojewodztwo: string
  areaHa: number
}

export interface WaterStatus {
  level: DroughtLevel
  label: string
  summary: string
  windowDays: number
  precipDeficitMm: number
  precipDeficitPct: number
  headline: string
  source: string
}

export interface HistoryYear {
  year: number
  balanceMm: number
}

export interface WaterHistory {
  deficitYears: number
  totalYears: number
  riskMonths: string
  windowLabel: string
  years: HistoryYear[]
  source: string
}

export interface Cause {
  id: string
  kind: "opady" | "gleba" | "spadek" | "upal" | "uprawa"
  value: string
  title: string
  detail: string
  source: string
}

export interface Recommendation {
  id: string
  group: RecommendationGroup
  title: string
  text: string
  when: string
  sceneMode: SceneMode
  sceneCaption: string
  why: string[]
  note?: string
}

export interface Vegetation {
  ndvi: number
  label: string
  imageDate: string
  imageAgeDays: number
}

export interface Confidence {
  level: ConfidenceLevel
  unknowns: string[]
}

export interface DataSource {
  key: SourceKey | "dzialka"
  name: string
  what: string
  license: string
  fetchedAt: string
}

export interface SourceStatus {
  key: SourceKey
  label: string
  ok: boolean
  pending?: boolean
  message?: string
}

export interface Analysis {
  id: string
  request: AnalysisRequest
  cropLabel: string
  parcel: Parcel
  status: WaterStatus
  history: WaterHistory
  causes: Cause[]
  vegetation: Vegetation | null
  recommendations: Recommendation[]
  confidence: Confidence
  sources: DataSource[]
  sourceStatus: SourceStatus[]
  scene?: { slopePct: number | null; ditchNearby: boolean | null }
  generatedAt: string
}

export type AnalysisError =
  | { code: "invalid_parcel_id"; message: string }
  | { code: "parcel_not_found"; message: string; parcelId: string }
  | { code: "date_out_of_range"; message: string; min: string; max: string }
  | { code: "upstream_unavailable"; message: string }
