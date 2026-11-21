import type { ParcelScene, Ring } from "@/lib/scene3d"
import type { SceneMode } from "@/lib/types"
import type { WorldContext } from "./contract"

export const WORLD_HALF = 10
export const ISLAND_DEPTH = 1.5
const FINE = 129
const CORNER = 0.2

export type World = WorldContext & {
  halfM: number
  cornerM: number
  fine: { size: number; stepM: number; heights: Float32Array }
  parcelCenter: [number, number]
  parcelAreaM2: number
  parcelAxis: number
  relief: number
  islandSdf: (x: number, y: number) => number
  projectToIsland: (x: number, y: number) => [number, number]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

export function ringArea(ring: Ring) {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  return a / 2
}

export function ringCentroid(ring: Ring): [number, number] {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    a += f
    cx += (ring[j][0] + ring[i][0]) * f
    cy += (ring[j][1] + ring[i][1]) * f
  }
  if (Math.abs(a) < 1e-9) {
    const n = ring.length || 1
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * a), cy / (3 * a)]
}

export function ringAxis(ring: Ring) {
  const [mx, my] = ringCentroid(ring)
  let cxx = 0
  let cyy = 0
  let cxy = 0
  const pts = densify(ring, 10, true)
  for (const [x, y] of pts) {
    cxx += (x - mx) * (x - mx)
    cyy += (y - my) * (y - my)
    cxy += (x - mx) * (y - my)
  }
  return 0.5 * Math.atan2(2 * cxy, cxx - cyy)
}

export function densify(points: Ring, maxStep: number, closed = false): Ring {
  const out: Ring = []
  const n = points.length
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const steps = Math.max(1, Math.ceil(len / maxStep))
    for (let k = 0; k < steps; k++) out.push([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps])
  }
  if (!closed && n > 0) out.push(points[n - 1])
  return out
}

export function pointInRings(x: number, y: number, rings: Ring[]) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function distanceToRings(x: number, y: number, rings: Ring[]) {
  let d = Infinity
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      d = Math.min(d, segDist(x, y, ring[j][0], ring[j][1], ring[i][0], ring[i][1]))
    }
  }
  return d
}

export function closestOnLine(points: Ring, x: number, y: number): [number, number] {
  let best: [number, number] = points[0]
  let bd = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy
    const t = l2 > 0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0
    const qx = ax + t * dx
    const qy = ay + t * dy
    const d = Math.hypot(x - qx, y - qy)
    if (d < bd) {
      bd = d
      best = [qx, qy]
    }
  }
  return best
}

export function createWorld(scene: ParcelScene): World {
  const H = scene.halfExtentM
  const { size, heights } = scene.grid
  const step = scene.grid.stepM || (2 * H) / (size - 1)
  const scale = WORLD_HALF / H
  const valid = heights.filter((h) => Number.isFinite(h))
  const minH = valid.length ? Math.min(...valid) : 0
  const maxH = valid.length ? Math.max(...valid) : 0
  const reliefM = maxH - minH
  const exaggeration = clamp((0.065 * 2 * H) / Math.max(reliefM, 0.5), 1.5, 12)

  const coarse = (c: number, r: number) => {
    const h = heights[clamp(r, 0, size - 1) * size + clamp(c, 0, size - 1)]
    return Number.isFinite(h) ? h : minH
  }
  const bicubic = (x: number, y: number) => {
    const gx = clamp((x + H) / step, 0, size - 1)
    const gy = clamp((H - y) / step, 0, size - 1)
    const c = Math.min(Math.floor(gx), size - 2)
    const r = Math.min(Math.floor(gy), size - 2)
    const tx = gx - c
    const ty = gy - r
    const rows = [-1, 0, 1, 2].map((dr) => catmull(coarse(c - 1, r + dr), coarse(c, r + dr), coarse(c + 1, r + dr), coarse(c + 2, r + dr), tx))
    return catmull(rows[0], rows[1], rows[2], rows[3], ty)
  }

  const fineStep = (2 * H) / (FINE - 1)
  const fineHeights = new Float32Array(FINE * FINE)
  for (let r = 0; r < FINE; r++) {
    for (let c = 0; c < FINE; c++) {
      const h = bicubic(-H + c * fineStep, H - r * fineStep)
      fineHeights[r * FINE + c] = Math.max(0, (h - minH) * exaggeration * scale)
    }
  }

  const heightAt = (x: number, y: number) => {
    const gx = clamp((x + H) / fineStep, 0, FINE - 1)
    const gy = clamp((H - y) / fineStep, 0, FINE - 1)
    const c = Math.min(Math.floor(gx), FINE - 2)
    const r = Math.min(Math.floor(gy), FINE - 2)
    const tx = gx - c
    const ty = gy - r
    const i = r * FINE + c
    const top = fineHeights[i] * (1 - tx) + fineHeights[i + 1] * tx
    const bottom = fineHeights[i + FINE] * (1 - tx) + fineHeights[i + FINE + 1] * tx
    return top * (1 - ty) + bottom * ty
  }

  const cornerM = CORNER * H
  const inner = H - cornerM
  const islandSdf = (x: number, y: number) => {
    const qx = Math.abs(x) - inner
    const qy = Math.abs(y) - inner
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - cornerM
  }
  const projectToIsland = (x: number, y: number): [number, number] => {
    if (islandSdf(x, y) <= 0) return [x, y]
    const qx = Math.abs(x) - inner
    const qy = Math.abs(y) - inner
    if (qx > 0 && qy > 0) {
      const l = Math.hypot(qx, qy)
      return [Math.sign(x) * (inner + (qx / l) * cornerM), Math.sign(y) * (inner + (qy / l) * cornerM)]
    }
    return [clamp(x, -H, H), clamp(y, -H, H)]
  }

  const parcelRings = scene.parcel.filter((r) => r.length >= 3)
  const parcelOuterRing = parcelRings.reduce<Ring>((best, r) => (Math.abs(ringArea(r)) > Math.abs(ringArea(best)) ? r : best), parcelRings[0] ?? [])
  const parcelAreaM2 = Math.max(
    1,
    parcelRings.reduce((sum, r) => {
      const hole = r !== parcelOuterRing && pointInRings(r[0][0], r[0][1], [parcelOuterRing])
      return sum + (hole ? -1 : 1) * Math.abs(ringArea(r))
    }, 0),
  )
  const parcelCenter = parcelOuterRing.length ? ringCentroid(parcelOuterRing) : ([0, 0] as [number, number])
  const parcelRadiusM = parcelOuterRing.reduce((m, p) => Math.max(m, Math.hypot(p[0] - parcelCenter[0], p[1] - parcelCenter[1])), 0) || 50
  const insideParcel = (x: number, y: number) => pointInRings(x, y, parcelRings)

  let nearestDitch: WorldContext["nearestDitch"] = null
  for (const line of scene.waterLines) {
    if (line.points.length < 2) continue
    let d = Infinity
    for (const [x, y] of densify(line.points, 8)) {
      if (islandSdf(x, y) > -5) continue
      d = Math.min(d, insideParcel(x, y) ? 0 : distanceToRings(x, y, parcelRings))
    }
    if (Number.isFinite(d) && (!nearestDitch || d < nearestDitch.distanceM)) nearestDitch = { kind: line.kind, points: line.points, distanceM: d }
  }

  let lowestParcelPoint: [number, number] = parcelCenter
  let lowest = Infinity
  for (let r = 0; r < FINE; r++) {
    for (let c = 0; c < FINE; c++) {
      const x = -H + c * fineStep
      const y = H - r * fineStep
      const h = fineHeights[r * FINE + c]
      if (h < lowest && insideParcel(x, y) && distanceToRings(x, y, parcelRings) > fineStep * 0.5) {
        lowest = h
        lowestParcelPoint = [x, y]
      }
    }
  }

  return {
    scene,
    metersToWorld: scale,
    verticalExaggeration: exaggeration,
    toWorld: (x, y, lift = 0) => [x * scale, heightAt(x, y) + lift, -y * scale],
    heightAt,
    insideParcel,
    parcelRadiusM,
    parcelOuterRing,
    nearestDitch,
    downslope: scene.downslope,
    lowestParcelPoint,
    halfM: H,
    cornerM,
    fine: { size: FINE, stepM: fineStep, heights: fineHeights },
    parcelCenter,
    parcelAreaM2,
    parcelAxis: parcelOuterRing.length ? ringAxis(parcelOuterRing) : 0,
    relief: reliefM * exaggeration * scale,
    islandSdf,
    projectToIsland,
  }
}

export function focusOf(world: World, mode: SceneMode): { point: [number, number]; radiusM: number } {
  const wide = Math.max(world.parcelRadiusM * 1.2, world.halfM * 1.18)
  if (mode === "zastawka") {
    const low = world.lowestParcelPoint
    const point = world.nearestDitch && world.nearestDitch.distanceM < world.halfM * 0.3 ? closestOnLine(world.nearestDitch.points, low[0], low[1]) : low
    return { point, radiusM: Math.max(world.halfM * 0.3, world.parcelRadiusM * 0.45) }
  }
  if (mode === "nawadnianie" || mode === "miedzyplon") return { point: world.parcelCenter, radiusM: Math.max(world.parcelRadiusM * 0.85, world.halfM * 0.34) }
  return { point: world.parcelCenter, radiusM: wide }
}
