import "server-only"
import { morkaAnalysis } from "@/lib/mock/morka"
import { cropLabel } from "@/lib/crops"
import type { Analysis, AnalysisError, AnalysisRequest } from "@/lib/types"
import { isDateInRange, dateRange, isValidParcelId } from "@/lib/validation"

const NOT_FOUND_SUFFIX = ".9999"

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

export async function runAnalysis(req: AnalysisRequest): Promise<AnalysisResult> {
  if (!isValidParcelId(req.parcelId)) {
    return { ok: false, error: { code: "invalid_parcel_id", message: "Nieprawidłowy numer działki." } }
  }
  if (!isDateInRange(req.date)) {
    const { min, max } = dateRange()
    return { ok: false, error: { code: "date_out_of_range", message: "Data spoza zakresu.", min, max } }
  }
  if (req.parcelId.endsWith(NOT_FOUND_SUFFIX)) {
    return {
      ok: false,
      error: { code: "parcel_not_found", message: "Nie znaleziono działki.", parcelId: req.parcelId },
    }
  }
  const analysis: Analysis = {
    ...morkaAnalysis,
    id: analysisIdFor(req),
    request: req,
    cropLabel: cropLabel(req.crop),
    parcel: { ...morkaAnalysis.parcel, id: req.parcelId },
  }
  return { ok: true, analysis }
}
