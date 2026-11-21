import { requestFromId, runAnalysis } from "@/lib/analysis-service"

export async function GET(_request: Request, ctx: RouteContext<"/api/analyses/[id]">) {
  const { id } = await ctx.params
  const req = requestFromId(id)
  if (!req) return Response.json({ code: "invalid_request", message: "Nieprawidłowy identyfikator analizy." }, { status: 400 })
  const result = await runAnalysis(req)
  if (!result.ok) return Response.json(result.error, { status: result.error.code === "parcel_not_found" ? 404 : 422 })
  return Response.json(result.analysis)
}
