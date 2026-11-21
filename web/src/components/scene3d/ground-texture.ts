import type { Ring } from "@/lib/scene3d"
import type { DroughtLevel } from "@/lib/types"
import { densify, ringArea, ringAxis, type World } from "./world"

const LUSH_FIELDS = ["#9DB25C", "#7DAF46", "#B4BE68", "#D9C38E", "#8FA14F", "#C6C383", "#A9AC66", "#E0C67C", "#93A957", "#C3A870"]
const DRY_FIELDS = ["#D9C38E", "#C3A870", "#BDA866", "#9DB25C", "#D8BE7A", "#C9B35E", "#E0C67C", "#A9AC66", "#CDAA5C", "#B3A45E"]

export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(i: number) {
  let h = Math.imul(i + 0x9e3779b9, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

export function soilColor(level: DroughtLevel) {
  return level <= 2 ? "#8A5A34" : level === 3 ? "#A9773F" : level === 4 ? "#B9834F" : "#C49A62"
}

export type GroundOptions = { size: number; level: DroughtLevel; rowGapM: number; ditchWidthM: number }

export function drawGround(world: World, { size, level, rowGapM, ditchWidthM }: GroundOptions) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas
  const H = world.halfM
  const k = size / (2 * H)
  const px = (x: number) => (x + H) * k
  const py = (y: number) => (H - y) * k
  const trace = (ring: Ring) => {
    ring.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))))
    ctx.closePath()
  }
  const rand = mulberry(7 + world.scene.neighbors.length)
  const dry = level >= 3

  ctx.fillStyle = dry ? "#CDBF83" : "#B7C171"
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 220; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = (0.02 + rand() * 0.06) * size
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const c = rand() > 0.5 ? (dry ? "201,168,104" : "139,163,80") : dry ? "222,205,150" : "190,196,118"
    g.addColorStop(0, `rgba(${c},0.35)`)
    g.addColorStop(1, `rgba(${c},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  const palette = dry ? DRY_FIELDS : LUSH_FIELDS
  world.scene.neighbors.forEach((ring, i) => {
    if (ring.length < 3) return
    const area = Math.abs(ringArea(ring))
    let perimeter = 0
    for (let j = 0; j < ring.length; j++) {
      const a = ring[j]
      const b = ring[(j + 1) % ring.length]
      perimeter += Math.hypot(b[0] - a[0], b[1] - a[1])
    }
    const compact = (4 * Math.PI * area) / Math.max(perimeter * perimeter, 1)
    const road = compact < 0.07 && area < 40000
    const h = hash(i)
    ctx.beginPath()
    trace(ring)
    ctx.fillStyle = road ? "#E4D3AC" : palette[h % palette.length]
    ctx.fill()
    if (!road && area > 1500) {
      ctx.save()
      ctx.clip()
      const angle = ringAxis(ring)
      const xs = ring.map((p) => px(p[0]))
      const ys = ring.map((p) => py(p[1]))
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2
      const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 2
      ctx.translate(cx, cy)
      ctx.rotate(-angle)
      ctx.strokeStyle = (h >> 8) % 2 ? "rgba(70,52,24,0.13)" : "rgba(255,250,230,0.16)"
      ctx.lineWidth = Math.max(1, 2.2 * k)
      const gap = Math.max(3, (5 + ((h >> 4) % 5)) * k)
      ctx.beginPath()
      for (let v = -span; v <= span; v += gap) {
        ctx.moveTo(-span, v)
        ctx.lineTo(span, v)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.beginPath()
    trace(ring)
    ctx.strokeStyle = road ? "rgba(150,120,80,0.25)" : "rgba(110,80,45,0.28)"
    ctx.lineWidth = Math.max(1, 1.6 * k)
    ctx.stroke()
  })

  for (const area of world.scene.waterAreas) {
    if (area.length < 3) continue
    ctx.beginPath()
    trace(area)
    ctx.fillStyle = "#3FA3B0"
    ctx.fill()
    ctx.strokeStyle = "#7CC6D6"
    ctx.lineWidth = Math.max(1.5, 3 * k)
    ctx.stroke()
  }

  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const line of world.scene.waterLines) {
    if (line.points.length < 2) continue
    ctx.beginPath()
    line.points.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))))
    ctx.strokeStyle = "rgba(92,104,62,0.75)"
    ctx.lineWidth = Math.max(3, ditchWidthM * 2.4 * k)
    ctx.stroke()
  }

  const parcel = world.scene.parcel.filter((r) => r.length >= 3)
  if (parcel.length) {
    ctx.save()
    ctx.beginPath()
    parcel.forEach(trace)
    ctx.clip("evenodd")
    ctx.fillStyle = soilColor(level)
    ctx.fillRect(0, 0, size, size)
    const angle = world.parcelAxis
    const [cx, cy] = world.parcelCenter
    ctx.translate(px(cx), py(cy))
    ctx.rotate(-angle)
    const span = world.parcelRadiusM * k * 1.2
    const gap = rowGapM * k
    ctx.fillStyle = level <= 2 ? "rgba(58,36,18,0.35)" : "rgba(90,58,30,0.3)"
    for (let v = -Math.ceil(span / gap) * gap; v <= span; v += gap) ctx.fillRect(-span, v - gap * 0.18, span * 2, gap * 0.36)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (level >= 3) {
      const crackRand = mulberry(31)
      const count = (level - 2) * 90
      const r = world.parcelRadiusM
      ctx.strokeStyle = level >= 4 ? "rgba(92,56,26,0.55)" : "rgba(92,56,26,0.4)"
      ctx.lineWidth = Math.max(1, 0.9 * k)
      for (let i = 0; i < count; i++) {
        let x = cx + (crackRand() * 2 - 1) * r
        let y = cy + (crackRand() * 2 - 1) * r
        let dir = crackRand() * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(px(x), py(y))
        const segs = 3 + Math.floor(crackRand() * 4)
        for (let s = 0; s < segs; s++) {
          dir += (crackRand() - 0.5) * 1.6
          const len = 4 + crackRand() * 9
          x += Math.cos(dir) * len
          y += Math.sin(dir) * len
          ctx.lineTo(px(x), py(y))
        }
        ctx.stroke()
      }
    }
    ctx.restore()
    ctx.beginPath()
    for (const ring of parcel) trace(densify(ring, 20, true))
    ctx.strokeStyle = "rgba(255,244,216,0.85)"
    ctx.lineWidth = Math.max(2, 4 * k)
    ctx.stroke()
  }

  return canvas
}
