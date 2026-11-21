import { requestFromId } from "@/lib/analysis-service"
import { isValidParcelKey } from "@/lib/validation"
import { loadParcelScene } from "@/server/sources/scene3d"

export async function GET(_request: Request, ctx: RouteContext<"/api/analyses/[id]/scene">) {
  const { id } = await ctx.params
  const req = requestFromId(id)
  if (!req || !isValidParcelKey(req.parcelId)) return Response.json({ code: "invalid_request" }, { status: 400 })
  try {
    const scene = await loadParcelScene(req.parcelId)
    if (!scene) return Response.json({ code: "parcel_not_found" }, { status: 404 })
    return Response.json(scene, { headers: { "Cache-Control": "public, max-age=86400" } })
  } catch (error) {
    console.warn(`[rosa] scene3d failed: ${error instanceof Error ? error.message : String(error)}`)
    return Response.json({ code: "upstream_unavailable" }, { status: 503 })
  }
}
