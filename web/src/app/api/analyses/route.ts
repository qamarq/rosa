import { runAnalysis } from "@/lib/analysis-service"
import { isCropId } from "@/lib/crops"
import type { AnalysisRequest } from "@/lib/types"
import { parcelKey } from "@/lib/validation"

type Body = Partial<AnalysisRequest> & { parcelIds?: unknown }

function parcelFrom(body: Body): string | null {
  if (Array.isArray(body.parcelIds)) return body.parcelIds.every((id) => typeof id === "string") ? parcelKey(body.parcelIds as string[]) : null
  return typeof body.parcelId === "string" ? body.parcelId.trim() : null
}

function statusFor(code: string): number {
  return code === "parcel_not_found" ? 404 : code === "upstream_unavailable" ? 503 : 422
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null
  const parcelId = body ? parcelFrom(body) : null
  if (!body || !parcelId || typeof body.date !== "string" || !isCropId(String(body.crop))) {
    return Response.json({ code: "invalid_request", message: "Brak wymaganych pól." }, { status: 400 })
  }
  const result = await runAnalysis({ parcelId, crop: body.crop!, date: body.date })
  if (!result.ok) return Response.json(result.error, { status: statusFor(result.error.code) })
  return Response.json(result.analysis)
}
