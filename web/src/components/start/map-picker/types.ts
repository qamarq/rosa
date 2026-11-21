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

const NEAR_M = 30

function project(lat0: number) {
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180)
  return (p: number[]): [number, number] => [p[0] * kx, p[1] * 110574]
}

function segmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

function rings(parcel: LocatedParcel, to: (p: number[]) => [number, number]): [number, number][][] {
  return parcel.geometry.coordinates.flatMap((polygon) => polygon.map((ring) => ring.map(to)))
}

function ringsDistance(a: [number, number][][], b: [number, number][][]): number {
  let best = Infinity
  for (const [from, to] of [[a, b], [b, a]]) {
    for (const ring of from) {
      for (const p of ring) {
        for (const other of to) {
          for (let i = 1; i < other.length; i++) {
            best = Math.min(best, segmentDistance(p, other[i - 1], other[i]))
            if (best === 0) return 0
          }
        }
      }
    }
  }
  return best
}

export function parcelsNear(a: LocatedParcel, b: LocatedParcel): boolean {
  const [[aw, as], [ae, an]] = parcelBounds(a.geometry)
  const [[bw, bs], [be, bn]] = parcelBounds(b.geometry)
  const pad = NEAR_M / 60000
  if (aw > be + pad * 2 || bw > ae + pad * 2 || as > bn + pad || bs > an + pad) return false
  const to = project((as + an) / 2)
  return ringsDistance(rings(a, to), rings(b, to)) <= NEAR_M
}

export function parcelsConnected(parcels: LocatedParcel[]): boolean {
  if (parcels.length < 2) return true
  const seen = new Set([0])
  const queue = [0]
  while (queue.length) {
    const i = queue.pop()!
    parcels.forEach((p, j) => {
      if (!seen.has(j) && parcelsNear(parcels[i], p)) {
        seen.add(j)
        queue.push(j)
      }
    })
  }
  return seen.size === parcels.length
}

export function parcelsBounds(parcels: LocatedParcel[]): [[number, number], [number, number]] {
  return parcelBounds({ type: "MultiPolygon", coordinates: parcels.flatMap((p) => p.geometry.coordinates) })
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
