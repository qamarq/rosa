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
}

const CROP_WIDTH: Record<CropId, number> = {
  kukurydza: 1.4,
  pszenica: 0.62,
  rzepak: 0.8,
  ziemniaki: 0.85,
  buraki: 0.8,
  laka: 0.6,
}

function part(geo: THREE.BufferGeometry, sx: number, sy: number, sz: number, y: number, rx = 0, ry = 0) {
  geo.scale(sx, sy, sz)
  if (rx) geo.rotateX(rx)
  if (ry) geo.rotateY(ry)
  geo.translate(0, y, 0)
  return geo.index ? geo.toNonIndexed() : geo
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

export function plantGeometry(crop: CropId) {
  let parts: THREE.BufferGeometry[]
  if (crop === "kukurydza") {
    parts = [
      part(new THREE.CylinderGeometry(0.035, 0.05, 1, 5), 1, 1, 1, 0.5),
      leaf(0.28, 0, 0.55),
      leaf(0.42, Math.PI * 0.95, 0.52),
      leaf(0.56, Math.PI * 0.45, 0.46),
      leaf(0.7, Math.PI * 1.45, 0.4),
      leaf(0.82, Math.PI * 0.2, 0.3),
      part(new THREE.ConeGeometry(0.07, 0.2, 5), 1, 1, 1, 1.02),
    ]
  } else if (crop === "pszenica") {
    parts = [part(new THREE.CylinderGeometry(0.42, 0.3, 0.7, 7), 1, 1, 1, 0.35), part(new THREE.SphereGeometry(0.42, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 1, 0.7, 1, 0.7)]
  } else if (crop === "rzepak") {
    parts = [part(new THREE.SphereGeometry(0.42, 8, 6), 1, 1.15, 1, 0.5), part(new THREE.SphereGeometry(0.24, 6, 4), 1, 0.8, 1, 0.9)]
  } else if (crop === "laka") {
    parts = [part(new THREE.ConeGeometry(0.4, 1, 6), 1, 1, 1, 0.5)]
  } else {
    parts = [part(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 1, 1.9, 1, 0)]
  }
  const merged = mergeGeometries(parts.map((p) => {
    p.deleteAttribute("uv")
    return p
  }))
  parts.forEach((p) => p.dispose())
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
      q.setFromAxisAngle(up, rand() * Math.PI * 2)
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
