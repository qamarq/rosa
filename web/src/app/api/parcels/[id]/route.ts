import { isValidParcelId, splitParcelIds } from "@/lib/validation"
import { findField } from "@/server/sources/parcel"

export async function GET(_request: Request, ctx: RouteContext<"/api/parcels/[id]">) {
  const { id } = await ctx.params
  const ids = splitParcelIds(decodeURIComponent(id))
  if (ids.length === 0 || !ids.every(isValidParcelId)) return Response.json({ code: "invalid_parcel_id" }, { status: 400 })
  try {
    const field = await findField(ids.join("+"))
    if (!field.ok) {
      return field.code === "parcel_not_found"
        ? Response.json({ code: field.code, parcelId: field.parcelId, message: field.message }, { status: 404 })
        : Response.json({ code: field.code, message: field.message }, { status: 422 })
    }
    const parcel = field.parcel
    return Response.json(
      {
        id: parcel.id,
        lat: parcel.lat,
        lon: parcel.lon,
        obreb: parcel.obreb,
        gmina: parcel.gmina,
        wojewodztwo: parcel.wojewodztwo,
        areaHa: parcel.areaHa,
        ...(parcel.parcelIds.length > 1 ? { parcelIds: parcel.parcelIds } : {}),
      },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    )
  } catch {
    return Response.json({ code: "upstream_unavailable" }, { status: 503 })
  }
}
