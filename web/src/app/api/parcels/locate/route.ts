import type { NextRequest } from "next/server"
import { findParcelByPoint } from "@/server/sources/parcel"

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"))
  const lon = Number(request.nextUrl.searchParams.get("lon"))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 48.9 || lat > 55 || lon < 14 || lon > 24.3) {
    return Response.json({ code: "invalid_point", message: "Punkt poza Polską." }, { status: 400 })
  }
  try {
    const parcel = await findParcelByPoint(lat, lon)
    if (!parcel) return Response.json({ code: "parcel_not_found", message: "W tym miejscu nie ma działki ewidencyjnej." }, { status: 404 })
    return Response.json({
      id: parcel.id,
      obreb: parcel.obreb,
      gmina: parcel.gmina,
      wojewodztwo: parcel.wojewodztwo,
      areaHa: parcel.areaHa,
      geometry: JSON.parse(parcel.geojson),
    })
  } catch {
    return Response.json({ code: "upstream_unavailable", message: "Baza działek chwilowo nie odpowiada." }, { status: 503 })
  }
}
