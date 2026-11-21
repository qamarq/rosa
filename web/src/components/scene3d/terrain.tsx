"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { ISLAND_DEPTH, type World } from "./world"

const BANDS = [
  { depth: 0.09, color: "#6E4726", follow: true },
  { depth: 0.4, color: "#9A6A3C", follow: false },
  { depth: 0.82, color: "#C08A50", follow: false },
  { depth: 1.16, color: "#A9773F", follow: false },
  { depth: ISLAND_DEPTH, color: "#7A5230", follow: false },
]

function buildTop(world: World, res: number) {
  const H = world.halfM
  const s = world.metersToWorld
  const positions = new Float32Array(res * res * 3)
  const uvs = new Float32Array(res * res * 2)
  const step = (2 * H) / (res - 1)
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const [x, y] = world.projectToIsland(-H + c * step, H - r * step)
      const i = r * res + c
      positions[i * 3] = x * s
      positions[i * 3 + 1] = world.heightAt(x, y)
      positions[i * 3 + 2] = -y * s
      uvs[i * 2] = (x + H) / (2 * H)
      uvs[i * 2 + 1] = (y + H) / (2 * H)
    }
  }
  const index: number[] = []
  for (let r = 0; r < res - 1; r++) {
    for (let c = 0; c < res - 1; c++) {
      const a = r * res + c
      const b = a + 1
      const d = a + res
      const e = d + 1
      index.push(a, d, b, b, d, e)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()

  const rim: [number, number, number][] = []
  const push = (r: number, c: number) => {
    const i = r * res + c
    rim.push([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]])
  }
  for (let c = 0; c < res - 1; c++) push(0, c)
  for (let r = 0; r < res - 1; r++) push(r, res - 1)
  for (let c = res - 1; c > 0; c--) push(res - 1, c)
  for (let r = res - 1; r > 0; r--) push(r, 0)
  return { geo, rim }
}

function buildSides(rim: [number, number, number][]) {
  const positions: number[] = []
  const colors: number[] = []
  const index: number[] = []
  const color = new THREE.Color()
  const n = rim.length
  BANDS.forEach((band, b) => {
    const base = positions.length / 3
    color.set(band.color)
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = rim[i % n]
      const upper = b === 0 ? y : BANDS[b - 1].follow ? y - BANDS[b - 1].depth : -BANDS[b - 1].depth
      const lower = band.follow ? y - band.depth : -band.depth
      const inset = b === BANDS.length - 1 ? 0.965 : 1 - b * 0.004
      const insetUp = b === 0 ? 1 : 1 - (b - 1) * 0.004
      positions.push(x * insetUp, upper, z * insetUp, x * inset, Math.min(lower, upper - 0.02), z * inset)
      const shade = 0.92 + (b % 2) * 0.08
      colors.push(color.r * 1.06, color.g * 1.06, color.b * 1.06, color.r * shade, color.g * shade, color.b * shade)
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(index)
  geo.computeVertexNormals()

  const shape = new THREE.Shape(rim.map(([x, , z]) => new THREE.Vector2(x * 0.965, z * 0.965)))
  const bottom = new THREE.ShapeGeometry(shape)
  bottom.rotateX(Math.PI / 2)
  bottom.translate(0, -ISLAND_DEPTH, 0)
  return { sides: geo, bottom }
}

function shadowTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64)
    g.addColorStop(0, "rgba(90,55,25,0.38)")
    g.addColorStop(0.6, "rgba(90,55,25,0.16)")
    g.addColorStop(1, "rgba(90,55,25,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Terrain({ world, texture, quality }: { world: World; texture: THREE.Texture; quality: "high" | "low" }) {
  const res = quality === "high" ? 129 : 73
  const { top, sides, bottom, shadow } = useMemo(() => {
    const t = buildTop(world, res)
    const s = buildSides(t.rim)
    return { top: t.geo, sides: s.sides, bottom: s.bottom, shadow: shadowTexture() }
  }, [world, res])

  useEffect(
    () => () => {
      top.dispose()
      sides.dispose()
      bottom.dispose()
      shadow.dispose()
    },
    [top, sides, bottom, shadow],
  )

  return (
    <group>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={sides} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={bottom}>
        <meshStandardMaterial color="#5A3A1E" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.6, -ISLAND_DEPTH - 0.25, 0.8]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
