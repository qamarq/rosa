import type { SceneMode } from "@/lib/types"
import type { WorldContext } from "../contract"

export type P = [number, number]

export const CHAR = 1.7
export const MACHINE = 1.4

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function openRing(ring: P[]): P[] {
  if (ring.length > 1) {
    const a = ring[0]
    const b = ring[ring.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1)
  }
  return ring
}

function signedArea(r: P[]) {
  let s = 0
  for (let i = 0; i < r.length; i++) {
    const a = r[i]
    const b = r[(i + 1) % r.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

function areaCentroid(r: P[]): P {
  let cx = 0
  let cy = 0
  let s = 0
  for (let i = 0; i < r.length; i++) {
    const a = r[i]
    const b = r[(i + 1) % r.length]
    const f = a[0] * b[1] - b[0] * a[1]
    cx += (a[0] + b[0]) * f
    cy += (a[1] + b[1]) * f
    s += f
  }
  if (Math.abs(s) < 1e-6) return r[0] ?? [0, 0]
  return [cx / (3 * s), cy / (3 * s)]
}

export function pointInRing(r: P[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0]
    const yi = r[i][1]
    const xj = r[j][0]
    const yj = r[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

type Closest = { x: number; y: number; d: number; i: number; t: number }

export function closestOnPolyline(pts: P[], x: number, y: number, closed = false): Closest {
  const best: Closest = { x: pts[0][0], y: pts[0][1], d: Infinity, i: 0, t: 0 }
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l2 = dx * dx + dy * dy
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0
    const px = a[0] + dx * t
    const py = a[1] + dy * t
    const d = Math.hypot(x - px, y - py)
    if (d < best.d) {
      best.x = px
      best.y = py
      best.d = d
      best.i = i
      best.t = t
    }
  }
  return best
}

function norm(x: number, y: number): P {
  const l = Math.hypot(x, y)
  return l > 1e-9 ? [x / l, y / l] : [0, 0]
}

function cumulative(pts: P[]) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return cum
}

function pointAt(pts: P[], cum: number[], s: number): P {
  if (s <= 0) return [pts[0][0], pts[0][1]]
  const total = cum[cum.length - 1]
  if (s >= total) return [pts[pts.length - 1][0], pts[pts.length - 1][1]]
  let i = 1
  while (i < cum.length - 1 && cum[i] < s) i++
  const seg = cum[i] - cum[i - 1]
  const t = seg > 0 ? (s - cum[i - 1]) / seg : 0
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]
}

export function yawX(ctx: WorldContext, p: P, dir: P) {
  const a = ctx.toWorld(p[0], p[1])
  const b = ctx.toWorld(p[0] + dir[0], p[1] + dir[1])
  return Math.atan2(-(b[2] - a[2]), b[0] - a[0])
}

export function yawZ(ctx: WorldContext, p: P, dir: P) {
  return yawX(ctx, p, dir) + Math.PI / 2
}

export type Track = { pos: Float32Array; yaw: Float32Array; count: number; length: number; step: number }

export function buildTrack(ctx: WorldContext, pts: P[], step: number): Track {
  const cum = cumulative(pts)
  const length = cum[cum.length - 1]
  const count = Math.max(2, Math.min(4000, Math.ceil(length / Math.max(step, 1e-3)) + 1))
  const realStep = length / (count - 1 || 1)
  const pos = new Float32Array(count * 3)
  const yaw = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const p = pointAt(pts, cum, i * realStep)
    const w = ctx.toWorld(p[0], p[1])
    pos[i * 3] = w[0]
    pos[i * 3 + 1] = w[1]
    pos[i * 3 + 2] = w[2]
  }
  for (let i = 0; i < count; i++) {
    const a = Math.max(0, i - 2)
    const b = Math.min(count - 1, i + 2)
    const dx = pos[b * 3] - pos[a * 3]
    const dz = pos[b * 3 + 2] - pos[a * 3 + 2]
    yaw[i] = Math.atan2(-dz, dx)
  }
  return { pos, yaw, count, length, step: realStep }
}

export type TrackSample = { x: number; y: number; z: number; yaw: number }

export function sampleTrack(track: Track, d: number, out: TrackSample): TrackSample {
  const f = Math.max(0, Math.min(track.count - 1, d / (track.step || 1)))
  const i = Math.min(track.count - 2, Math.floor(f))
  const t = f - i
  const p = track.pos
  out.x = p[i * 3] + (p[i * 3 + 3] - p[i * 3]) * t
  out.y = p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * t
  out.z = p[i * 3 + 2] + (p[i * 3 + 5] - p[i * 3 + 2]) * t
  let dy = track.yaw[i + 1] - track.yaw[i]
  while (dy > Math.PI) dy -= Math.PI * 2
  while (dy < -Math.PI) dy += Math.PI * 2
  out.yaw = track.yaw[i] + dy * t
  return out
}

export type Site = { pos: P; yaw: number; scale: number }

export type Gate = {
  pos: P
  along: P
  side: P
  onDitch: boolean
  approach: P
  start: P
  ribbon: P[]
}

export type Row = { a: P; b: P; startCum: number }

export type Layout = {
  ring: P[]
  centre: P
  inner: P
  rEq: number
  toy: number
  k: number
  kc: number
  km: number
  bbox: [number, number, number, number]
  barn: Site | null
  silo: Site | null
  trees: Site[]
  home: P
  gate: Gate
  rows: Row[]
  path: P[]
  sprinkler: P
  wetR: number
  edgeDistance: (x: number, y: number) => number
  randomInside: (rand: () => number) => P
}

export function computeLayout(ctx: WorldContext): Layout {
  const ring = openRing(ctx.parcelOuterRing as P[])
  const area = signedArea(ring)
  const ccw = area > 0
  const rEq = Math.max(20, Math.sqrt(Math.abs(area) / Math.PI))
  const toy = Math.max(1, Math.min(16, rEq / 26))
  const k = toy * ctx.metersToWorld
  let centre = areaCentroid(ring)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const bbox: [number, number, number, number] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const half = ctx.scene.halfExtentM * 0.94
  const edgeDistance = (x: number, y: number) => closestOnPolyline(ring, x, y, true).d
  const inside = (x: number, y: number) => ctx.insideParcel(x, y)

  let inner: P = centre
  let bestScore = -Infinity
  const N = 22
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = bbox[0] + ((bbox[2] - bbox[0]) * i) / N
      const y = bbox[1] + ((bbox[3] - bbox[1]) * j) / N
      if (!inside(x, y)) continue
      const score = edgeDistance(x, y) - 0.3 * Math.hypot(x - centre[0], y - centre[1])
      if (score > bestScore) {
        bestScore = score
        inner = [x, y]
      }
    }
  }
  if (!inside(centre[0], centre[1])) centre = inner

  const randomInside = (rand: () => number): P => {
    for (let n = 0; n < 60; n++) {
      const x = bbox[0] + (bbox[2] - bbox[0]) * rand()
      const y = bbox[1] + (bbox[3] - bbox[1]) * rand()
      if (inside(x, y)) return [x, y]
    }
    return inner
  }

  const water = ctx.scene.waterLines.map((w) => w.points as P[]).filter((p) => p.length >= 2)
  const waterAreas = ctx.scene.waterAreas.map((r) => openRing(r as P[]))
  const taken: { p: P; r: number }[] = []
  const siteOk = (x: number, y: number, clear: number) => {
    if (Math.abs(x) > half - clear || Math.abs(y) > half - clear) return false
    if (inside(x, y) || edgeDistance(x, y) < clear) return false
    for (const w of water) if (closestOnPolyline(w, x, y).d < clear + toy * 1.5) return false
    for (const a of waterAreas) if (pointInRing(a, x, y) || closestOnPolyline(a, x, y, true).d < clear) return false
    for (const t of taken) if (Math.hypot(t.p[0] - x, t.p[1] - y) < t.r + clear) return false
    return true
  }

  const perimeter = cumulative([...ring, ring[0]])
  const total = perimeter[perimeter.length - 1]
  type Cand = { p: P; n: P; t: P }
  const edgeCands = (offset: number): Cand[] => {
    const out: Cand[] = []
    const closed = [...ring, ring[0]]
    for (let i = 0; i < 64; i++) {
      const s = (total * (i + 0.5)) / 64
      const p = pointAt(closed, perimeter, s)
      const a = pointAt(closed, perimeter, s - 2)
      const b = pointAt(closed, perimeter, s + 2)
      const t = norm(b[0] - a[0], b[1] - a[1])
      const n: P = ccw ? [t[1], -t[0]] : [-t[1], t[0]]
      out.push({ p: [p[0] + n[0] * offset, p[1] + n[1] * offset], n, t })
    }
    return out
  }

  const northScore = (p: P) => (p[1] - centre[1]) / rEq - 0.15 * Math.abs(p[0] - centre[0]) / rEq

  let barn: Site | null = null
  let silo: Site | null = null
  const trees: Site[] = []
  const barnClear = 6 * toy
  const barnCands = edgeCands(barnClear + toy).sort((a, b) => northScore(b.p) - northScore(a.p))
  let barnCand: Cand | null = null
  for (const c of barnCands) {
    if (siteOk(c.p[0], c.p[1], barnClear)) {
      barnCand = c
      break
    }
  }
  if (barnCand) {
    const inward: P = [-barnCand.n[0], -barnCand.n[1]]
    barn = { pos: barnCand.p, yaw: yawZ(ctx, barnCand.p, inward), scale: 1 }
    taken.push({ p: barnCand.p, r: barnClear })
    const siloCands: P[] = []
    for (const d of [8.4, 10])
      for (const out of [0, 1.5])
        for (const sign of [1, -1])
          siloCands.push([
            barnCand.p[0] + barnCand.t[0] * sign * d * toy + barnCand.n[0] * out * toy,
            barnCand.p[1] + barnCand.t[1] * sign * d * toy + barnCand.n[1] * out * toy,
          ])
    for (const p of siloCands) {
      const sign = (p[0] - barnCand.p[0]) * barnCand.t[0] + (p[1] - barnCand.p[1]) * barnCand.t[1] > 0 ? 1 : -1
      if (siteOk(p[0], p[1], 1.6 * toy)) {
        silo = { pos: p, yaw: 0, scale: 1 }
        taken.push({ p, r: 1.6 * toy })
        const q: P = [p[0] + barnCand.t[0] * sign * 4 * toy + barnCand.n[0] * toy, p[1] + barnCand.t[1] * sign * 4 * toy + barnCand.n[1] * toy]
        if (siteOk(q[0], q[1], 2.2 * toy)) {
          trees.push({ pos: q, yaw: 0, scale: 1.15 })
          taken.push({ p: q, r: 2.2 * toy })
        }
        break
      }
    }
    for (const sign of [-1, 1]) {
      const p: P = [
        barnCand.p[0] - barnCand.t[0] * sign * 8.5 * toy + barnCand.n[0] * 2 * toy,
        barnCand.p[1] - barnCand.t[1] * sign * 8.5 * toy + barnCand.n[1] * 2 * toy,
      ]
      if (siteOk(p[0], p[1], 2.2 * toy)) {
        trees.push({ pos: p, yaw: 0, scale: 1 })
        taken.push({ p, r: 2.2 * toy })
        break
      }
    }
  }
  const treeCands = edgeCands(3.2 * toy).sort((a, b) => northScore(b.p) - northScore(a.p))
  const rand = rng(7)
  for (const c of treeCands) {
    if (trees.length >= 7) break
    if (trees.some((t) => Math.hypot(t.pos[0] - c.p[0], t.pos[1] - c.p[1]) < rEq * 0.4)) continue
    if (!siteOk(c.p[0], c.p[1], 2.2 * toy)) continue
    trees.push({ pos: c.p, yaw: rand() * 6.28, scale: 0.85 + rand() * 0.35 })
    taken.push({ p: c.p, r: 2.2 * toy })
    const q: P = [c.p[0] + c.t[0] * 3.2 * toy + c.n[0] * 1.2 * toy, c.p[1] + c.t[1] * 3.2 * toy + c.n[1] * 1.2 * toy]
    if (siteOk(q[0], q[1], 1.8 * toy)) {
      trees.push({ pos: q, yaw: rand() * 6.28, scale: 0.7 + rand() * 0.2 })
      taken.push({ p: q, r: 1.8 * toy })
    }
  }

  let home: P = inner
  const anchor = barn?.pos ?? [centre[0], bbox[3]]
  const edge = closestOnPolyline(ring, anchor[0], anchor[1], true)
  const toCentre = norm(inner[0] - edge.x, inner[1] - edge.y)
  for (const d of [6, 9, 12]) {
    const p: P = [edge.x + toCentre[0] * d * toy, edge.y + toCentre[1] * d * toy]
    if (inside(p[0], p[1]) && edgeDistance(p[0], p[1]) > 2.5 * toy) {
      home = p
      break
    }
  }

  const low = ctx.lowestParcelPoint as P
  let gate: Gate
  const ditch = ctx.nearestDitch && ctx.nearestDitch.points.length >= 2 ? (ctx.nearestDitch.points as P[]) : null
  if (ditch) {
    const q = closestOnPolyline(ditch, low[0], low[1])
    const a = ditch[q.i]
    const b = ditch[q.i + 1]
    const along = norm(b[0] - a[0], b[1] - a[1])
    let side: P = [-along[1], along[0]]
    const ref: P = Math.hypot(low[0] - q.x, low[1] - q.y) > toy ? low : inner
    if ((ref[0] - q.x) * side[0] + (ref[1] - q.y) * side[1] < 0) side = [-side[0], -side[1]]
    const cum = cumulative(ditch)
    const sQ = cum[q.i] + q.t * (cum[q.i + 1] - cum[q.i])
    const ribbon: P[] = []
    const L = 7 * toy
    for (let s = sQ - L; s <= sQ + L + 1e-6; s += Math.max(toy * 0.7, 0.5)) ribbon.push(pointAt(ditch, cum, s))
    const pos: P = [q.x, q.y]
    gate = {
      pos,
      along,
      side,
      onDitch: true,
      approach: [pos[0] + side[0] * 3.1 * toy * MACHINE, pos[1] + side[1] * 3.1 * toy * MACHINE],
      start: [pos[0] + side[0] * 14 * toy + along[0] * 4 * toy, pos[1] + side[1] * 14 * toy + along[1] * 4 * toy],
      ribbon,
    }
  } else {
    const down = norm(ctx.downslope.x, ctx.downslope.y)
    const dir: P = down[0] === 0 && down[1] === 0 ? [0, -1] : down
    const side: P = [-dir[0], -dir[1]]
    const along: P = [-dir[1], dir[0]]
    gate = {
      pos: low,
      along,
      side,
      onDitch: false,
      approach: [low[0] + side[0] * 3.1 * toy * MACHINE, low[1] + side[1] * 3.1 * toy * MACHINE],
      start: [low[0] + side[0] * 14 * toy, low[1] + side[1] * 14 * toy],
      ribbon: [-5, -2.5, 0, 2.5, 5].map((s): P => [low[0] + along[0] * s * toy, low[1] + along[1] * s * toy]),
    }
  }

  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    if (l === 0) continue
    sxx += (dx * dx) / l
    syy += (dy * dy) / l
    sxy += (dx * dy) / l
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const u: P = [Math.cos(theta), Math.sin(theta)]
  const v: P = [-u[1], u[0]]
  let vmin = Infinity
  let vmax = -Infinity
  for (const p of ring) {
    const pv = (p[0] - centre[0]) * v[0] + (p[1] - centre[1]) * v[1]
    vmin = Math.min(vmin, pv)
    vmax = Math.max(vmax, pv)
  }
  const width = vmax - vmin
  const nRows = Math.max(3, Math.min(9, Math.round(width / (5 * toy))))
  const spacing = width / nRows
  const rows: Row[] = []
  const path: P[] = []
  let cum = 0
  for (let r = 0; r < nRows; r++) {
    const off = vmin + spacing * (r + 0.5)
    const ox = centre[0] + v[0] * off
    const oy = centre[1] + v[1] * off
    const hits: number[] = []
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      const ex = b[0] - a[0]
      const ey = b[1] - a[1]
      const den = u[0] * ey - u[1] * ex
      if (Math.abs(den) < 1e-9) continue
      const wx = a[0] - ox
      const wy = a[1] - oy
      const s = (wx * ey - wy * ex) / den
      const t = (wx * u[1] - wy * u[0]) / den
      if (t >= 0 && t < 1) hits.push(s)
    }
    hits.sort((p, q) => p - q)
    let s0 = 0
    let s1 = 0
    for (let i = 0; i + 1 < hits.length; i += 2) {
      if (hits[i + 1] - hits[i] > s1 - s0) {
        s0 = hits[i]
        s1 = hits[i + 1]
      }
    }
    const margin = 2.5 * toy
    if (s1 - s0 < margin * 3) continue
    s0 += margin
    s1 -= margin
    const forward = rows.length % 2 === 0
    const a: P = [ox + u[0] * (forward ? s0 : s1), oy + u[1] * (forward ? s0 : s1)]
    const b: P = [ox + u[0] * (forward ? s1 : s0), oy + u[1] * (forward ? s1 : s0)]
    if (path.length) cum += Math.hypot(a[0] - path[path.length - 1][0], a[1] - path[path.length - 1][1])
    rows.push({ a, b, startCum: cum })
    cum += s1 - s0
    path.push(a, b)
  }
  if (path.length < 2) {
    const a: P = [inner[0] - u[0] * rEq * 0.4, inner[1] - u[1] * rEq * 0.4]
    const b: P = [inner[0] + u[0] * rEq * 0.4, inner[1] + u[1] * rEq * 0.4]
    rows.push({ a, b, startCum: 0 })
    path.push(a, b)
  }

  const sprinkler = inner
  const wetR = Math.max(2.5 * toy, Math.min(7 * toy, edgeDistance(inner[0], inner[1]) * 1.1))

  return { ring, centre, inner, rEq, toy, k, kc: k * CHAR, km: k * MACHINE, bbox, barn, silo, trees, home, gate, rows, path, sprinkler, wetR, edgeDistance, randomInside }
}

export function farmerSpot(ctx: WorldContext, layout: Layout, mode: SceneMode): { farmer: P; dog: P } {
  const { toy, gate, home, sprinkler, wetR } = layout
  let farmer = home
  if (mode === "zastawka") {
    farmer = [
      gate.pos[0] + gate.side[0] * 3 * toy * MACHINE + gate.along[0] * 4.2 * toy * MACHINE,
      gate.pos[1] + gate.side[1] * 3 * toy * MACHINE + gate.along[1] * 4.2 * toy * MACHINE,
    ]
  } else if (mode === "nawadnianie") {
    const d = norm(home[0] - sprinkler[0], home[1] - sprinkler[1])
    const p: P = [sprinkler[0] + d[0] * (wetR + 2 * toy * CHAR), sprinkler[1] + d[1] * (wetR + 2 * toy * CHAR)]
    if (ctx.insideParcel(p[0], p[1])) farmer = p
  }
  const t = norm(farmer[0] - layout.inner[0], farmer[1] - layout.inner[1])
  const side: P = t[0] === 0 && t[1] === 0 ? [1, 0] : [-t[1], t[0]]
  const dog: P = [farmer[0] + side[0] * 1.3 * toy * CHAR, farmer[1] + side[1] * 1.3 * toy * CHAR]
  return { farmer, dog }
}

export function gradientDir(ctx: WorldContext, x: number, y: number, h: number): P {
  const gx = (ctx.heightAt(x + h, y) - ctx.heightAt(x - h, y)) / (2 * h)
  const gy = (ctx.heightAt(x, y + h) - ctx.heightAt(x, y - h)) / (2 * h)
  return norm(-gx, -gy)
}

export function buildFlowPaths(ctx: WorldContext, layout: Layout, count: number, steps: number, seed = 11) {
  const rand = rng(seed)
  const out = new Float32Array(count * (steps + 1) * 3)
  const stepLen = (layout.rEq * 0.55) / steps
  const h = Math.max(2, ctx.scene.grid.stepM * 0.5)
  const ds = norm(ctx.downslope.x, ctx.downslope.y)
  const target = layout.gate.onDitch ? layout.gate.pos : (ctx.lowestParcelPoint as P)
  const lift = 0.35 * layout.toy
  for (let n = 0; n < count; n++) {
    let [x, y] = layout.randomInside(rand)
    for (let s = 0; s <= steps; s++) {
      const w = ctx.toWorld(x, y, lift)
      const o = (n * (steps + 1) + s) * 3
      out[o] = w[0]
      out[o + 1] = w[1]
      out[o + 2] = w[2]
      const g = gradientDir(ctx, x, y, h)
      const tl = norm(target[0] - x, target[1] - y)
      const d = norm(g[0] * 0.9 + ds[0] * 0.6 + tl[0] * 0.35, g[1] * 0.9 + ds[1] * 0.6 + tl[1] * 0.35)
      const nx = x + d[0] * stepLen
      const ny = y + d[1] * stepLen
      if (ctx.insideParcel(nx, ny)) {
        x = nx
        y = ny
      } else {
        const ax = x + tl[0] * stepLen * 0.5
        const ay = y + tl[1] * stepLen * 0.5
        if (ctx.insideParcel(ax, ay)) {
          x = ax
          y = ay
        }
      }
    }
  }
  return out
}
