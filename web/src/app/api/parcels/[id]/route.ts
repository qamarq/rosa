import { isValidParcelId } from "@/lib/validation"
import { findParcelById } from "@/server/sources/parcel"

export async function GET(_request: Request, ctx: RouteContext<"/api/parcels/[id]">) {
  const { id } = await ctx.params
  const parcelId = decodeURIComponent(id)
  if (!isValidParcelId(parcelId)) return Response.json({ code: "invalid_parcel_id" }, { status: 400 })
  try {
    const parcel = await findParcelById(parcelId)
    if (!parcel) return Response.json({ code: "parcel_not_found", parcelId }, { status: 404 })
    return Response.json(
      { id: parcel.id, lat: parcel.lat, lon: parcel.lon, obreb: parcel.obreb, gmina: parcel.gmina, wojewodztwo: parcel.wojewodztwo, areaHa: parcel.areaHa },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    )
  } catch {
    return Response.json({ code: "upstream_unavailable" }, { status: 503 })
  }
}
