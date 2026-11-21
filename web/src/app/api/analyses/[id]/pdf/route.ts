import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { requestFromId, runAnalysis } from "@/lib/analysis-service"
import { formatDatePl, toIsoDate } from "@/lib/validation"
import { ReportPdf } from "@/server/pdf/report-pdf"
import { loadParcelScene } from "@/server/sources/scene3d"

export async function GET(_request: Request, ctx: RouteContext<"/api/analyses/[id]/pdf">) {
  const { id } = await ctx.params
  const req = requestFromId(id)
  if (!req) return Response.json({ code: "invalid_request" }, { status: 400 })
  const result = await runAnalysis(req)
  if (!result.ok) return Response.json(result.error, { status: result.error.code === "parcel_not_found" ? 404 : 422 })
  const scene = await loadParcelScene(req.parcelId).catch(() => null)
  const doc = createElement(ReportPdf, { analysis: result.analysis, scene, generatedAt: formatDatePl(toIsoDate(new Date())) }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(doc)
  const name = `ROSA-${req.parcelId.replace(/[^\w.-]+/g, "-")}-${req.date}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, max-age=600",
    },
  })
}
