"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { CropId, DroughtLevel } from "@/lib/types"
import { mulberry } from "./ground-texture"
import { createPlantMaterial, setUniform, type TimeUniforms } from "./materials"
import { distanceToRings, pointInRings, type World } from "./world"

const CROP_HEIGHT: Record<CropId, number> = {
  kukurydza: 2.4,
  pszenica: 0.95,
  rzepak: 1.3,
  ziemniaki: 0.85,
  buraki: 0.75,
  laka: 0.65,
  "pszenica-jara": 0.85,
  "jeczmien-ozimy": 0.85,
  "jeczmien-jary": 0.8,
  zyto: 1.25,
  pszenzyto: 1.05,
  owies: 0.95,
  "kukurydza-kiszonka": 2.6,
  straczkowe: 0.5,
  warzywa: 0.4,
  truskawki: 0.28,
  krzewy: 0.8,
  sad: 1.2,
  chmiel: 2.8,
  tyton: 1.15,
}

const CROP_WIDTH: Record<CropId, number> = {
  kukurydza: 1.4,
  pszenica: 0.62,
  rzepak: 0.8,
  ziemniaki: 0.85,
  buraki: 0.8,
  laka: 0.6,
  "pszenica-jara": 0.6,
  "jeczmien-ozimy": 0.62,
  "jeczmien-jary": 0.6,
  zyto: 0.55,
  pszenzyto: 0.62,
  owies: 0.6,
  "kukurydza-kiszonka": 1.45,
  straczkowe: 1,
  warzywa: 1,
  truskawki: 1,
  krzewy: 1,
  sad: 1,
  chmiel: 1,
  tyton: 1,
}

const CEREAL_TINT: Partial<Record<CropId, [string, number]>> = {
  "pszenica-jara": ["#B9C978", 0.12],
  "jeczmien-ozimy": ["#D8C77E", 0.16],
  "jeczmien-jary": ["#D8CF8A", 0.2],
  zyto: ["#8FA48C", 0.2],
  pszenzyto: ["#C7B068", 0.1],
  owies: ["#C3CF8E", 0.22],
}

const GAP_UNITS = new Set<CropId>(["straczkowe", "warzywa", "truskawki", "krzewy", "sad", "chmiel", "tyton"])

const ROW_ALIGNED = new Set<CropId>(["truskawki", "krzewy", "chmiel"])

function part(geo: THREE.BufferGeometry, sx: number, sy: number, sz: number, y: number, rx = 0, ry = 0) {
  geo.scale(sx, sy, sz)
  if (rx) geo.rotateX(rx)
  if (ry) geo.rotateY(ry)
  geo.translate(0, y, 0)
  return geo.index ? geo.toNonIndexed() : geo
}

function blob(geo: THREE.BufferGeometry, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  geo.scale(sx, sy, sz)
  geo.translate(x, y, z)
  return geo.index ? geo.toNonIndexed() : geo
}

function accent(geo: THREE.BufferGeometry, hex?: string, amount = 1) {
  const n = geo.attributes.position.count
  const data = new Float32Array(n * 4)
  if (hex) {
    const c = new THREE.Color(hex)
    for (let i = 0; i < n; i++) data.set([c.r, c.g, c.b, amount], i * 4)
  }
  geo.setAttribute("aAccent", new THREE.BufferAttribute(data, 4))
  return geo
}

function dots(points: [number, number, number][], r: number, hex: string, amount = 0.92) {
  return points.map(([x, y, z]) => accent(blob(new THREE.SphereGeometry(r, 4, 3), 1, 1, 1, x, y, z), hex, amount))
}

function leaf(y: number, turn: number, length: number) {
  const g = new THREE.SphereGeometry(0.5, 5, 3)
  g.scale(length, 0.05, 0.17)
  g.translate(length * 0.42, 0, 0)
  g.rotateZ(-0.45)
  g.rotateY(turn)
  g.translate(0, y, 0)
  return g.toNonIndexed()
}

function broadLeaf(y: number, turn: number, length: number, width: number, tilt: number) {
  const g = new THREE.SphereGeometry(0.5, 6, 3)
  g.scale(length, 0.04, width)
  g.translate(length * 0.45, 0, 0)
  g.rotateZ(tilt)
  g.rotateY(turn)
  g.translate(0, y, 0)
  return g.toNonIndexed()
}

function cornParts() {
  return [
    part(new THREE.CylinderGeometry(0.035, 0.05, 1, 5), 1, 1, 1, 0.5),
    leaf(0.28, 0, 0.55),
    leaf(0.42, Math.PI * 0.95, 0.52),
    leaf(0.56, Math.PI * 0.45, 0.46),
    leaf(0.7, Math.PI * 1.45, 0.4),
    leaf(0.82, Math.PI * 0.2, 0.3),
    part(new THREE.ConeGeometry(0.07, 0.2, 5), 1, 1, 1, 1.02),
  ]
}

function wheatParts() {
  return [part(new THREE.CylinderGeometry(0.42, 0.3, 0.7, 7), 1, 1, 1, 0.35), part(new THREE.SphereGeometry(0.42, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 1, 0.7, 1, 0.7)]
}

function gapUnitParts(crop: CropId): THREE.BufferGeometry[] {
  switch (crop) {
    case "straczkowe":
      return [
        blob(new THREE.SphereGeometry(0.24, 7, 5), 1, 0.85, 1, -0.14, 0.2, 0.02),
        blob(new THREE.SphereGeometry(0.24, 7, 5), 1, 0.85, 1, 0.14, 0.22, 0.06),
        blob(new THREE.SphereGeometry(0.22, 7, 5), 1, 0.85, 1, 0, 0.3, -0.1),
        ...dots([[-0.32, 0.2, 0.06], [0.34, 0.24, -0.04], [0.04, 0.3, 0.24], [-0.06, 0.38, -0.26]], 0.05, "#CFE08A", 0.6),
      ]
    case "warzywa":
      return [
        accent(blob(new THREE.SphereGeometry(0.24, 8, 5), 1, 0.8, 1, 0, 0.2, 0), "#C2D98A", 0.35),
        ...[0, 1, 2, 3, 4].map((i) => broadLeaf(0.07, (i / 5) * Math.PI * 2 + 0.3, 0.44, 0.24, 0.3)),
      ]
    case "truskawki":
      return [
        blob(new THREE.SphereGeometry(0.5, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), 1.1, 0.5, 0.5, 0, 0, 0),
        ...dots([[-0.42, 0.13, 0.17], [-0.2, 0.18, -0.15], [0.02, 0.17, 0.18], [0.24, 0.18, -0.14], [0.44, 0.12, 0.15]], 0.06, "#D2352B", 0.95),
        ...dots([[-0.3, 0.24, 0.03], [0.32, 0.24, 0.02]], 0.035, "#F5F1E6", 0.9),
      ]
    case "krzewy":
      return [
        blob(new THREE.SphereGeometry(0.5, 8, 5), 0.9, 0.72, 0.42, 0, 0.38, 0),
        ...dots([[-0.25, 0.32, 0.18], [0.05, 0.5, 0.19], [0.28, 0.36, 0.17], [-0.12, 0.45, -0.19], [0.2, 0.28, -0.18], [-0.32, 0.5, -0.12]], 0.045, "#8E2335", 0.9),
      ]
    case "sad":
      return [
        accent(blob(new THREE.CylinderGeometry(0.04, 0.055, 0.55, 5), 1, 1, 1, 0, 0.275, 0), "#7A5532", 1),
        blob(new THREE.IcosahedronGeometry(0.34, 1), 1, 0.9, 1, 0, 0.82, 0),
        ...dots([[0.26, 0.78, 0.18], [-0.24, 0.9, 0.2], [0.05, 0.72, -0.31], [-0.2, 0.7, -0.22], [0.2, 1.0, -0.12]], 0.05, "#C8452E", 0.92),
      ]
    case "chmiel":
      return [
        accent(blob(new THREE.CylinderGeometry(0.022, 0.028, 2.8, 4), 1, 1, 1, 0.27, 1.4, 0), "#8A6A44", 1),
        accent(blob(new THREE.CylinderGeometry(0.012, 0.012, 0.64, 3), 1, 1, 1, 0, 0, 0).rotateZ(Math.PI / 2).translate(0, 2.74, 0), "#4F4740", 1),
        blob(new THREE.CylinderGeometry(0.09, 0.15, 2.45, 6), 1, 1, 1, 0, 1.28, 0),
        ...dots([[0.12, 1.9, 0.06], [-0.11, 1.5, 0.1], [0.08, 1.1, -0.14], [-0.1, 2.2, -0.05], [0.15, 0.8, 0.07]], 0.05, "#C5DB7A", 0.65),
      ]
    case "tyton":
      return [
        blob(new THREE.CylinderGeometry(0.03, 0.04, 1.05, 5), 1, 1, 1, 0, 0.525, 0),
        broadLeaf(0.16, 0.2, 0.58, 0.3, 0.05),
        broadLeaf(0.3, 2.3, 0.56, 0.3, 0.08),
        broadLeaf(0.44, 4.4, 0.52, 0.28, 0.1),
        broadLeaf(0.6, 1.2, 0.44, 0.24, 0.14),
        broadLeaf(0.76, 3.4, 0.34, 0.18, 0.2),
        ...dots([[0, 1.09, 0], [0.05, 1.06, 0.04]], 0.04, "#E59AB0", 0.85),
      ]
    default:
      return wheatParts()
  }
}

export function plantGeometry(crop: CropId) {
  let parts: THREE.BufferGeometry[]
  if (crop === "kukurydza" || crop === "kukurydza-kiszonka") {
    parts = cornParts()
  } else if (crop === "pszenica" || CEREAL_TINT[crop]) {
    const tint = CEREAL_TINT[crop]
    parts = wheatParts().map((p) => (tint ? accent(p, tint[0], tint[1]) : p))
  } else if (crop === "rzepak") {
    parts = [part(new THREE.SphereGeometry(0.42, 8, 6), 1, 1.15, 1, 0.5), part(new THREE.SphereGeometry(0.24, 6, 4), 1, 0.8, 1, 0.9)]
  } else if (crop === "laka") {
    parts = [part(new THREE.ConeGeometry(0.4, 1, 6), 1, 1, 1, 0.5)]
  } else if (GAP_UNITS.has(crop)) {
    parts = gapUnitParts(crop)
  } else {
    parts = [part(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 1, 1.9, 1, 0)]
  }
  const merged = mergeGeometries(parts.map((p) => {
    p.deleteAttribute("uv")
    return p.getAttribute("aAccent") ? p : accent(p)
  }))
  parts.forEach((p) => p.dispose())
  if (GAP_UNITS.has(crop)) merged.scale(1, 1 / CROP_HEIGHT[crop], 1)
  merged.computeVertexNormals()
  return merged
}

export function conditionColor(ndvi: number | null, level: DroughtLevel) {
  const stops: [number, string][] = [
    [0.1, "#A9773F"],
    [0.25, "#C3A870"],
    [0.38, "#D9C38E"],
    [0.5, "#9DB25C"],
    [0.62, "#7DAF46"],
    [0.78, "#6E9B3A"],
  ]
  const v = ndvi ?? [0.74, 0.64, 0.5, 0.34, 0.2][level - 1]
  const c = new THREE.Color()
  if (v <= stops[0][0]) return c.set(stops[0][1])
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])
      return c.set(stops[i - 1][1]).lerp(new THREE.Color(stops[i][1]), t)
    }
  }
  return c.set(stops[stops.length - 1][1])
}

export function rowGapFor(world: World, target: number) {
  const spacing = Math.sqrt(world.parcelAreaM2 / target)
  return spacing * 1.35
}

type Placement = { matrices: Float32Array; colors: Float32Array; count: number }

function place(world: World, crop: CropId, ndvi: number | null, level: DroughtLevel, target: number): Placement {
  const s = world.metersToWorld
  const rowGap = rowGapFor(world, target)
  const stepAlong = rowGap * 0.55
  const rings = world.scene.parcel.filter((r) => r.length >= 3)
  const [cx, cy] = world.parcelCenter
  const ax = Math.cos(world.parcelAxis)
  const ay = Math.sin(world.parcelAxis)
  const span = world.parcelRadiusM * 1.1
  const rand = mulberry(97)
  const base = conditionColor(ndvi, level)
  const dryTone = new THREE.Color(level >= 4 ? "#B9834F" : "#D9C38E")
  const lush = new THREE.Color("#6E9B3A")
  const dryShare = level >= 3 ? 0.12 + (level - 3) * 0.16 : 0
  const gapW = rowGap * s
  const height = CROP_HEIGHT[crop] * gapW
  const margin = rowGap * 0.45
  const water = world.scene.waterLines.map((l) => l.points)
  const clearM = Math.max(9, rowGap * 1.2)
  const nearWater = (x: number, y: number) => {
    for (const line of water) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i]
        const [bx, by] = line[i + 1]
        const dx = bx - ax
        const dy = by - ay
        const l2 = dx * dx + dy * dy
        const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0
        if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < clearM) return true
      }
    }
    return world.scene.waterAreas.length > 0 && pointInRings(x, y, world.scene.waterAreas)
  }
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const color = new THREE.Color()
  const mats: number[] = []
  const cols: number[] = []
  const relief = Math.max(world.relief, 0.001)
  const rows = Math.ceil(span / rowGap)
  for (let r = -rows; r <= rows; r++) {
    const v = r * rowGap
    for (let u = -span; u <= span; u += stepAlong) {
      const uu = u + (rand() - 0.5) * stepAlong * 0.3
      const vv = v + (rand() - 0.5) * rowGap * 0.08
      const x = cx + ax * uu - ay * vv
      const y = cy + ay * uu + ax * vv
      if (!world.insideParcel(x, y) || world.islandSdf(x, y) > -margin) continue
      if (distanceToRings(x, y, rings) < margin || nearWater(x, y)) continue
      const h = world.heightAt(x, y)
      const highness = h / relief
      const dryness = Math.min(1, dryShare * (0.6 + highness * 1.4) + (rand() - 0.5) * 0.25)
      const dryHere = rand() < dryness
      const sizeJitter = 0.8 + rand() * 0.4
      const plantH = height * sizeJitter * (dryHere ? 0.82 : 1)
      const width = gapW * CROP_WIDTH[crop] * (0.85 + rand() * 0.3)
      pos.set(x * s, h - 0.01, -y * s)
      q.setFromAxisAngle(up, ROW_ALIGNED.has(crop) ? world.parcelAxis + (rand() - 0.5) * 0.08 : rand() * Math.PI * 2)
      scl.set(width, plantH, width)
      m.compose(pos, q, scl)
      mats.push(...m.elements)
      color.copy(base)
      if (dryHere) color.lerp(dryTone, 0.55 + rand() * 0.35)
      else if (level <= 2) color.lerp(lush, rand() * 0.3)
      color.offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * 0.06)
      cols.push(color.r, color.g, color.b)
    }
  }
  return { matrices: new Float32Array(mats), colors: new Float32Array(cols), count: cols.length / 3 }
}

export function CropField({
  world,
  crop,
  ndvi,
  level,
  target,
  time,
  animate,
  shadows,
  revealAt,
}: {
  world: World
  crop: CropId
  ndvi: number | null
  level: DroughtLevel
  target: number
  time: TimeUniforms
  animate: boolean
  shadows: boolean
  revealAt: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => plantGeometry(crop), [crop])
  const placement = useMemo(() => place(world, crop, ndvi, level, target), [world, crop, ndvi, level, target])
  const grow = useMemo(() => ({ value: animate ? 0 : 2 }), [animate])
  const material = useMemo(() => createPlantMaterial(time, grow), [time, grow])
  const depthMaterial = useMemo(() => createPlantMaterial(time, grow, true), [time, grow])
  const capacity = Math.max(1, placement.count)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.instanceMatrix.array.set(placement.matrices)
    mesh.instanceMatrix.needsUpdate = true
    const colorAttr = new THREE.InstancedBufferAttribute(placement.colors, 3)
    mesh.instanceColor = colorAttr
    mesh.count = placement.count
    mesh.computeBoundingSphere()
    invalidate()
  }, [placement, geometry, invalidate])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      depthMaterial.dispose()
    },
    [geometry, material, depthMaterial],
  )

  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.elapsedTime - revealAt
    setUniform(grow, t <= 0 ? 0 : Math.min(2, t / 1.1))
  })

  return <instancedMesh key={capacity} ref={meshRef} args={[geometry, undefined, capacity]} material={material} customDepthMaterial={depthMaterial} castShadow={shadows} receiveShadow={false} frustumCulled={false} />
}
