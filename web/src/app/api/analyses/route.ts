import { runAnalysis } from "@/lib/analysis-service"
import { isCropId } from "@/lib/crops"
import type { AnalysisRequest } from "@/lib/types"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<AnalysisRequest> | null
  if (!body || typeof body.parcelId !== "string" || typeof body.date !== "string" || !isCropId(String(body.crop))) {
    return Response.json({ code: "invalid_request", message: "Brak wymaganych pól." }, { status: 400 })
  }
  const result = await runAnalysis({ parcelId: body.parcelId.trim(), crop: body.crop!, date: body.date })
  if (!result.ok) {
    const status = result.error.code === "parcel_not_found" ? 404 : result.error.code === "upstream_unavailable" ? 503 : 422
    return Response.json(result.error, { status })
  }
  return Response.json(result.analysis)
}
