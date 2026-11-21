"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { Ring } from "@/lib/scene3d"
import type { DroughtLevel } from "@/lib/types"
import { createFlowMaterial, createPondMaterial, setOpacity, type TimeUniforms } from "./materials"
import { densify, ringCentroid, type World } from "./world"

const WIDTH_M = { "rów": 7, ciek: 10, "kanał": 13 }

export function ribbon(
  world: World,
  points: Ring,
  widthW: number,
  lift: number,
  extra?: (along: number, total: number) => number,
): { geometry: THREE.BufferGeometry; length: number } | null {
  const pts = points.map(([x, y]) => world.toWorld(x, y, lift))
  if (pts.length < 2) return null
  const positions: number[] = []
  const flow: number[] = []
  const across: number[] = []
  const index: number[] = []
  let total = 0
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2])
    cum.push(total)
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    let dx = b[0] - a[0]
    let dz = b[2] - a[2]
    const l = Math.hypot(dx, dz) || 1
    dx /= l
    dz /= l
    const w = widthW / 2
    const [x, y, z] = pts[i]
    const yy = y + (extra ? extra(cum[i], total) : 0)
    positions.push(x - dz * w, yy, z + dx * w, x + dz * w, yy, z - dx * w)
    flow.push(cum[i], cum[i])
    across.push(-1, 1)
    if (i < pts.length - 1) {
      const k = i * 2
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aFlow", new THREE.Float32BufferAttribute(flow, 1))
  geometry.setAttribute("aAlong", new THREE.Float32BufferAttribute(flow.map((f) => f / (total || 1)), 1))
  geometry.setAttribute("aAcross", new THREE.Float32BufferAttribute(across, 1))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return { geometry, length: total }
}

function clipRuns(world: World, points: Ring, stepM: number): Ring[] {
  const runs: Ring[] = []
  let cur: Ring = []
  for (const p of densify(points, stepM)) {
    if (world.islandSdf(p[0], p[1]) < -6) cur.push(p)
    else if (cur.length) {
      runs.push(cur)
      cur = []
    }
  }
  if (cur.length > 1) runs.push(cur)
  return runs.filter((r) => r.length > 1)
}

export function Water({ world, time, level }: { world: World; time: TimeUniforms; level: DroughtLevel }) {
  const s = world.metersToWorld
  const stepM = (world.halfM * 2) / 180
  const shrink = level >= 5 ? 0.6 : level >= 4 ? 0.75 : 1
  const built = useMemo(() => {
    const lines: { geometry: THREE.BufferGeometry; highlight: boolean; glow: boolean }[] = []
    for (const line of world.scene.waterLines) {
      const highlight = !!world.nearestDitch && world.nearestDitch.points === line.points
      for (const run of clipRuns(world, line.points, stepM)) {
        const first = world.heightAt(run[0][0], run[0][1])
        const last = world.heightAt(run[run.length - 1][0], run[run.length - 1][1])
        const ordered = first < last ? [...run].reverse() : run
        const width = WIDTH_M[line.kind] * s * shrink * (highlight ? 1.45 : 1)
        const r = ribbon(world, ordered, width, 0.035)
        if (r) lines.push({ geometry: r.geometry, highlight, glow: false })
        if (highlight) {
          const g = ribbon(world, ordered, width * 4.2, 0.03)
          if (g) lines.push({ geometry: g.geometry, highlight, glow: true })
        }
      }
    }
    const ponds: { geometry: THREE.ShapeGeometry; y: number }[] = []
    for (const area of world.scene.waterAreas) {
      if (area.length < 3) continue
      const [cx, cy] = ringCentroid(area)
      if (world.islandSdf(cx, cy) > -10) continue
      const inside = area.map(([x, y]) => world.projectToIsland(x, y))
      const hs = inside.map(([x, y]) => world.heightAt(x, y)).sort((a, b) => a - b)
      const y = hs[Math.floor(hs.length * 0.6)] + 0.04
      const geometry = new THREE.ShapeGeometry(new THREE.Shape(inside.map(([x, yy]) => new THREE.Vector2(x * s, yy * s))))
      geometry.rotateX(-Math.PI / 2)
      ponds.push({ geometry, y })
    }
    return { lines, ponds }
  }, [world, s, stepM, shrink])

  const materials = useMemo(
    () => ({
      line: createFlowMaterial(time, "#3FA3B0", false),
      highlight: createFlowMaterial(time, "#2B9AAA", true),
      glow: new THREE.MeshBasicMaterial({ color: "#BDF1F5", transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      pond: createPondMaterial(time),
    }),
    [time],
  )

  useEffect(
    () => () => {
      built.lines.forEach((l) => l.geometry.dispose())
      built.ponds.forEach((p) => p.geometry.dispose())
    },
    [built],
  )
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])

  useFrame(() => {
    setOpacity(materials.glow, 0.22 + Math.sin(time.uTime.value * 2.2) * 0.1)
  })

  return (
    <group>
      {built.lines.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.glow ? materials.glow : l.highlight ? materials.highlight : materials.line} receiveShadow={!l.glow} renderOrder={l.glow ? 1 : 2} />
      ))}
      {built.ponds.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={materials.pond} position-y={p.y} receiveShadow />
      ))}
    </group>
  )
}
