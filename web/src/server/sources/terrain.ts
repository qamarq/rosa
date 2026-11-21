import "server-only"
import { cached } from "@/server/cache"
import { fetchText } from "@/server/http"

export type TerrainSummary = {
  points: number
  minM: number
  maxM: number
  reliefM: number
  slopePct: number
  downslope: string
  lowestPoint2180: [number, number]
}

const DIRECTIONS = ["północ", "północny wschód", "wschód", "południowy wschód", "południe", "południowy zachód", "zachód", "północny zachód"]

function directionFromVector(dx: number, dy: number): string {
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI
  const idx = Math.round(((angle + 360) % 360) / 45) % 8
  return DIRECTIONS[idx]
}

function fitPlane(pts: { x: number; y: number; z: number }[]) {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const mz = pts.reduce((s, p) => s + p.z, 0) / n
  let sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my, dz = p.z - mz
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
    sxz += dx * dz
    syz += dy * dz
  }
  const det = sxx * syy - sxy * sxy
  if (Math.abs(det) < 1e-9) return { a: 0, b: 0 }
  return { a: (sxz * syy - syz * sxy) / det, b: (syz * sxx - sxz * sxy) / det }
}

export async function loadTerrain(parcelId: string, points2180: [number, number][]): Promise<TerrainSummary | null> {
  if (points2180.length < 4) return null
  return cached("gugik-nmt", parcelId, null, async () => {
    const list = points2180.map(([x, y]) => `${y} ${x}`).join(",")
    const body = await fetchText("https://services.gugik.gov.pl/nmt/?" + new URLSearchParams({ request: "GetHByPointList", list }), 6000)
    const pts = body
      .split(",")
      .map((t) => t.trim().split(/\s+/).map(Number))
      .filter((v) => v.length === 3 && v.every(Number.isFinite) && v[2] > -100)
      .map(([north, east, z]) => ({ x: east, y: north, z }))
    if (pts.length < 4) return null
    const { a, b } = fitPlane(pts)
    const slopePct = Math.round(Math.hypot(a, b) * 1000) / 10
    const zs = pts.map((p) => p.z)
    const lowest = pts.reduce((m, p) => (p.z < m.z ? p : m), pts[0])
    return {
      points: pts.length,
      minM: Math.min(...zs),
      maxM: Math.max(...zs),
      reliefM: Math.round((Math.max(...zs) - Math.min(...zs)) * 10) / 10,
      slopePct,
      downslope: directionFromVector(-a, -b),
      lowestPoint2180: [lowest.x, lowest.y],
    }
  })
}
