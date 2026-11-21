export type ParcelGeometry = {
  type: "MultiPolygon"
  coordinates: number[][][][]
}

export type LocatedParcel = {
  id: string
  obreb: string
  gmina: string
  wojewodztwo: string
  areaHa: number
  geometry: ParcelGeometry
}

const AREA = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 })

export function formatArea(areaHa: number): string {
  return `${AREA.format(areaHa)} ha`
}

export function parcelPlace(parcel: LocatedParcel): string {
  return [parcel.obreb, parcel.gmina ? `gm. ${parcel.gmina}` : null].filter(Boolean).join(", ")
}

export function parcelBounds(geometry: ParcelGeometry): [[number, number], [number, number]] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ]
}
