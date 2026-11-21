"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { ParcelScene } from "@/lib/scene3d"
import type { Analysis, CropId, SceneMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BASE_AZ, DEFAULT_CAMERA, applyPose, applyViewRect, clonePose, computePose, easeInOutCubic, fitDistances, lerpPose, makeFraming, type Pose } from "./camera-rig"
import { createTimeUniforms, setOpacity } from "./materials"
import { FirstFrame, FpsWatch, ParcelWorld, SceneLights, Ticker, initialQuality, type Quality } from "./parcel-scene"
import { POLAND_OUTLINE } from "./poland-outline"
import { createWorld, type World } from "./world"

export type JourneyPhase = "search" | "fly" | "hover" | "trace" | "sources" | "wait" | "panel" | "done"

export const PHASES: JourneyPhase[] = ["search", "fly", "hover", "trace", "sources", "wait", "panel", "done"]
export const phaseAtLeast = (phase: JourneyPhase, min: JourneyPhase) => PHASES.indexOf(phase) >= PHASES.indexOf(min)

const LON0 = 19.3
const LAT0 = 52.0
const K = 5.5
const SLAB = 0.9
const POLAND_RADIUS = 21
const FLY_S = 1.2
const TRACE_S = 0.8
const SOURCES_S = 2.2
const PANEL_S = 0.8
const GMINA_SCALE = 2.1
const deg = THREE.MathUtils.degToRad
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function projectLonLat(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * Math.cos(deg(LAT0)) * K, -(lat - LAT0) * K]
}

type Stage = {
  phase: JourneyPhase
  t0: number
  from: Pose | null
  pose: Pose | null
  offset: THREE.Vector3
  pinAt: number | null
  drift: number
  polandScale: number
  polandFade: number
  ambient: number
  lens: number
  rise: number
  ortho: { value: number }
  satAt: number | null
  shrinkAt: number | null
  panelAt: number | null
}

const newStage = (): Stage => ({
  phase: "search",
  t0: 0,
  from: null,
  pose: null,
  offset: new THREE.Vector3(),
  pinAt: null,
  drift: 0,
  polandScale: 1,
  polandFade: 0,
  ambient: 0.75,
  lens: 0,
  rise: 0,
  ortho: { value: 1 },
  satAt: null,
  shrinkAt: null,
  panelAt: null,
})

function cloudTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const blobs: [number, number, number][] = [
      [64, 70, 42],
      [42, 72, 28],
      [86, 74, 30],
      [58, 52, 30],
      [78, 56, 24],
    ]
    for (const [x, y, r] of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, "rgba(255,252,244,0.95)")
      g.addColorStop(0.55, "rgba(255,246,228,0.6)")
      g.addColorStop(1, "rgba(255,240,215,0)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

type Cloud = { pos: THREE.Vector3; size: number; base: number; speed: number }

function makeClouds(count: number, seed: number, area: (r: () => number) => [number, number, number], size: [number, number], base: number): Cloud[] {
  const r = rng(seed)
  return Array.from({ length: count }, () => {
    const [x, y, z] = area(r)
    return { pos: new THREE.Vector3(x, y, z), size: size[0] + r() * (size[1] - size[0]), base: base * (0.7 + r() * 0.3), speed: 0.15 + r() * 0.25 }
  })
}

function CloudLayer({
  clouds,
  texture,
  factor,
  stageRef,
}: {
  clouds: Cloud[]
  texture: THREE.Texture
  factor: (s: Stage) => number
  stageRef: React.RefObject<Stage | null>
}) {
  const materials = useMemo(
    () => clouds.map(() => new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0, fog: false, toneMapped: false })),
    [clouds, texture],
  )
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const world = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }, delta) => {
    const s = stageRef.current
    if (!s) return
    const f = factor(s)
    clouds.forEach((c, i) => {
      const sprite = refs.current[i]
      if (!sprite) return
      sprite.position.x = c.pos.x + Math.sin(performance.now() / 9000 + i) * c.speed * 4
      sprite.getWorldPosition(world)
      const d = world.distanceTo(camera.position)
      const scale = sprite.parent ? sprite.parent.scale.x : 1
      const near = smooth(c.size * scale * 0.15, c.size * scale * 0.6, d)
      setOpacity(materials[i], c.base * f * near)
      sprite.visible = c.base * f * near > 0.01
    })
    void delta
  })

  return (
    <>
      {clouds.map((c, i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={c.pos}
          scale={[c.size, c.size * 0.62, 1]}
          material={materials[i]}
          renderOrder={10}
        />
      ))}
    </>
  )
}

const RIVERS: [number, number][][] = [
  [[19.0, 49.62], [19.4, 50.0], [20.0, 50.06], [20.9, 50.32], [21.6, 50.85], [21.85, 51.4], [21.4, 51.95], [21.0, 52.35], [20.3, 52.55], [19.5, 52.62], [18.7, 52.95], [18.45, 53.45], [18.75, 53.95], [18.92, 54.33]],
  [[18.25, 49.95], [17.95, 50.38], [17.45, 50.78], [17.0, 51.1], [16.4, 51.32], [15.8, 51.72], [15.25, 51.95], [14.72, 52.18], [14.6, 52.62], [14.35, 53.2], [14.55, 53.62]],
  [[19.45, 50.62], [19.05, 51.12], [18.75, 51.72], [18.2, 52.08], [17.55, 52.02], [16.95, 52.32], [16.3, 52.42], [15.6, 52.6], [14.72, 52.58]],
]

function riverGeometry(points: [number, number][]) {
  const pts = points.map(([lon, lat]) => {
    const [x, z] = projectLonLat(lon, lat)
    return new THREE.Vector3(x, SLAB + 0.32, z)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.055, 6, false)
}

function PolandMap({ stageRef, texture }: { stageRef: React.RefObject<Stage | null>; texture: THREE.Texture }) {
  const group = useRef<THREE.Group>(null)
  const { geometry, materials, shadow } = useMemo(() => {
    const shape = new THREE.Shape(POLAND_OUTLINE.map(([lon, lat]) => {
      const [x, z] = projectLonLat(lon, lat)
      return new THREE.Vector2(x, -z)
    }))
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.35, bevelSegments: 3, curveSegments: 2 })
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    const top = new THREE.MeshStandardMaterial({ color: "#EAD5A8", roughness: 0.9, transparent: true })
    const side = new THREE.MeshStandardMaterial({ color: "#C08A50", roughness: 0.95, transparent: true })
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
      g.addColorStop(0, "rgba(120,80,40,0.32)")
      g.addColorStop(1, "rgba(120,80,40,0)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    }
    const sh = new THREE.CanvasTexture(canvas)
    return { geometry: geo, materials: [top, side], shadow: sh }
  }, [])
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false, toneMapped: false }), [shadow])
  const rivers = useMemo(() => RIVERS.map(riverGeometry), [])
  const riverMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5FB3C0", roughness: 0.4, transparent: true }), [])
  useEffect(
    () => () => {
      rivers.forEach((g) => g.dispose())
      riverMat.dispose()
    },
    [rivers, riverMat],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      materials.forEach((m) => m.dispose())
      shadow.dispose()
      shadowMat.dispose()
    },
    [geometry, materials, shadow, shadowMat],
  )
  const ambient = useMemo(
    () =>
      makeClouds(
        11,
        7,
        (r) => {
          const a = r() * Math.PI * 2
          const d = 10 + r() * 16
          return [Math.cos(a) * d, 9 + r() * 9, Math.sin(a) * d * 0.8]
        },
        [7, 12],
        0.85,
      ),
    [],
  )

  useFrame(() => {
    const s = stageRef.current
    const g = group.current
    if (!s || !g) return
    const scale = s.polandScale
    g.scale.setScalar(scale)
    g.position.copy(s.offset).multiplyScalar(scale)
    g.position.y = -SLAB * (scale - 1) - s.polandFade * 2
    const o = 1 - smooth(0.35, 0.95, s.polandFade)
    materials.forEach((m) => setOpacity(m, o))
    setOpacity(shadowMat, o)
    setOpacity(riverMat, o)
    g.visible = o > 0.01 || s.ambient * (1 - s.polandFade) > 0.01
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={materials} receiveShadow />
      {rivers.map((g, i) => (
        <mesh key={i} geometry={g} material={riverMat} />
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0.8, -0.6, 1]} material={shadowMat}>
        <planeGeometry args={[70, 62]} />
      </mesh>
      <CloudLayer clouds={ambient} texture={texture} stageRef={stageRef} factor={(s) => s.ambient * (1 - smooth(0.4, 1, s.polandFade))} />
    </group>
  )
}

function Pin({ stageRef }: { stageRef: React.RefObject<Stage | null> }) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#0E6E73", transparent: true, depthWrite: false, toneMapped: false }), [])
  useEffect(() => () => ringMat.dispose(), [ringMat])
  useFrame(({ clock }) => {
    const s = stageRef.current
    const g = group.current
    if (!s || !g) return
    if (s.pinAt === null) {
      g.visible = false
      return
    }
    const t = clock.elapsedTime - s.pinAt
    const fall = clamp01(t / 0.5)
    const bounce = t > 0.5 ? Math.sin(Math.min(1, (t - 0.5) / 0.3) * Math.PI) * 0.35 : 0
    const fade = 1 - smooth(0, 0.35, s.polandFade)
    g.visible = fade > 0.01
    g.position.set(0, SLAB + 0.25 + (1 - fall * fall) * 8 + bounce, 0)
    const squash = t > 0.45 && t < 0.7 ? 1 - Math.sin(((t - 0.45) / 0.25) * Math.PI) * 0.12 : 1
    g.scale.set(fade * (2 - squash), fade * squash, fade * (2 - squash))
    if (ring.current) {
      const p = (Math.max(0, t - 0.45) % 1.6) / 1.6
      ring.current.visible = t > 0.45 && fade > 0.01
      ring.current.scale.setScalar(0.4 + p * 2.0)
      setOpacity(ringMat, (1 - p) * 0.9 * fade)
      ring.current.position.y = SLAB + 0.3 - g.position.y
    }
  })
  return (
    <group ref={group}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.62, 20, 14]} />
        <meshStandardMaterial color="#0E6E73" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.65, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.42, 1.25, 18]} />
        <meshStandardMaterial color="#0E6E73" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.62, 0.5]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#FFFDF8" roughness={0.6} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} material={ringMat}>
        <ringGeometry args={[1.0, 1.3, 40]} />
      </mesh>
    </group>
  )
}

function IslandRiser({ stageRef, children }: { stageRef: React.RefObject<Stage | null>; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const s = stageRef.current
    const g = group.current
    if (!s || !g) return
    const e = 1 - Math.pow(1 - clamp01(s.rise), 3)
    g.visible = s.rise > 0
    g.scale.set(1, 0.03 + 0.97 * e, 1)
  })
  return <group ref={group}>{children}</group>
}

function Satellite({ stageRef }: { stageRef: React.RefObject<Stage | null> }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const s = stageRef.current
    const g = group.current
    if (!s || !g) return
    if (s.satAt === null) {
      g.visible = false
      return
    }
    const t = clock.elapsedTime - s.satAt
    const away = s.panelAt !== null ? clamp01((clock.elapsedTime - s.panelAt) / 0.5) : 0
    const a = -2.4 + t * 0.55
    g.visible = away < 1
    g.position.set(Math.cos(a) * 6.5, 6.2 + Math.sin(t * 1.3) * 0.15 + away * 6, Math.sin(a) * 4.5 - 1.5)
    g.rotation.set(0.25, -a, Math.sin(t * 0.8) * 0.08)
    g.scale.setScalar(0.62 * Math.min(1, t / 0.4) * (1 - away))
  })
  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.5, 0.62, 0.5]} />
        <meshStandardMaterial color="#5B4D3E" roughness={0.5} />
      </mesh>
      <mesh position={[-0.78, 0, 0]}>
        <boxGeometry args={[0.95, 0.05, 0.5]} />
        <meshStandardMaterial color="#3FA3B0" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.78, 0, 0]}>
        <boxGeometry args={[0.95, 0.05, 0.5]} />
        <meshStandardMaterial color="#3FA3B0" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#E3A73C" emissive="#E3A73C" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

export type PanelRect = { top: number; left: number; width: number; height: number; radius: number }

type Gates = { pin: [number, number] | null; world: World | null; proceed: boolean; mode: SceneMode; panel: PanelRect | null }

function Director({
  stageRef,
  gates,
  onPhase,
  flightPath,
  frame,
}: {
  stageRef: React.RefObject<Stage | null>
  gates: Gates
  onPhase: (phase: JourneyPhase, at: number) => void
  flightPath: React.RefObject<SVGPathElement | null>
  frame: React.RefObject<HTMLDivElement | null>
}) {
  const { camera, size } = useThree()
  const framing = useMemo(() => (gates.world ? makeFraming(gates.world, gates.mode) : null), [gates.world, gates.mode])
  const pinScreen = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, scene }, delta) => {
    const s = stageRef.current
    if (!s) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const fov = (camera as THREE.PerspectiveCamera).fov
    const vw = size.width
    const vh = size.height
    const panel = gates.panel
    if (panel && s.shrinkAt === null) s.shrinkAt = t
    const e = panel && s.shrinkAt !== null ? 1 - Math.pow(1 - clamp01((t - s.shrinkAt) / 0.7), 3) : 0
    const rect = panel
      ? { x: panel.left * e, y: panel.top * e, w: vw + (panel.width - vw) * e, h: vh + (panel.height - vh) * e, r: panel.radius * e }
      : null
    const fw = rect ? rect.w : vw
    const fh = rect ? rect.h : vh
    const fit = fitDistances(fov, fw, fh)
    const tt = t - s.t0
    const go = (phase: JourneyPhase) => {
      s.phase = phase
      s.t0 = t
      s.from = s.pose ? clonePose(s.pose) : null
      if (phase === "panel") s.panelAt = t
      onPhase(phase, t)
    }

    if (gates.pin && s.pinAt === null) {
      const shift = new THREE.Vector3(-gates.pin[0], 0, -gates.pin[1]).sub(s.offset)
      s.offset.add(shift)
      s.pose?.target.add(shift)
      s.from?.target.add(shift)
      s.pinAt = t
    }

    const countryPose = (): Pose => ({ az: BASE_AZ + 0.14 + s.drift, el: deg(60), dist: fit.sphere(POLAND_RADIUS), target: s.offset.clone() })
    const gminaPose = (): Pose => ({ az: BASE_AZ - 0.04 + s.drift, el: deg(35), dist: 34, target: new THREE.Vector3(0, 0, 0) })
    const finalPose = (): Pose | null => (framing ? computePose(framing, DEFAULT_CAMERA, 0, fov, fw, fh) : null)
    const tracePose = (): Pose | null => {
      const f = finalPose()
      return f ? { az: f.az - 0.22, el: deg(62), dist: f.dist * 1.12, target: f.target } : null
    }
    const sourcesPose = (): Pose | null => {
      const f = finalPose()
      return f ? { az: f.az - 0.1 + s.drift, el: f.el + deg(7), dist: f.dist * 1.08, target: f.target } : null
    }

    if (!s.pose) s.pose = countryPose()
    const p = s.pose
    const ease = (dur: number) => easeInOutCubic(clamp01(tt / dur))
    const follow = (target: Pose | null, rate: number) => {
      if (target) lerpPose(p, p, target, 1 - Math.exp(-dt * rate))
    }

    switch (s.phase) {
      case "search": {
        s.drift += dt * 0.02
        follow(countryPose(), 6)
        if (s.pinAt !== null && t - s.pinAt > 0.15) go("fly")
        break
      }
      case "fly": {
        const k = ease(FLY_S)
        if (s.from) lerpPose(p, s.from, gminaPose(), k)
        s.polandScale = 1 + (GMINA_SCALE - 1) * k
        s.lens = smooth(0.55, 1, k) * 0.35
        if (k >= 1) {
          s.drift = 0
          go(gates.world ? "trace" : "hover")
        }
        break
      }
      case "hover": {
        s.drift += dt * 0.035
        const g = gminaPose()
        g.dist += Math.sin(t * 0.6) * 0.8
        follow(g, 2.5)
        s.lens = 0.35
        if (gates.world && framing) {
          s.drift = 0
          go("trace")
        }
        break
      }
      case "trace": {
        const k = ease(TRACE_S)
        const target = tracePose()
        if (s.from && target) lerpPose(p, s.from, target, k)
        s.polandFade = smooth(0, 0.42, tt)
        s.polandScale = GMINA_SCALE * (1 + 9 * s.polandFade * s.polandFade)
        s.lens = 0.9 * (1 - smooth(0.12, 0.7, tt))
        s.rise = tt / 1.6
        s.ortho.value = 1
        if (k >= 1) go("sources")
        break
      }
      case "sources": {
        const k = ease(SOURCES_S)
        const target = sourcesPose()
        if (s.from && target) lerpPose(p, s.from, target, k)
        s.rise = (tt + TRACE_S) / 1.6
        s.ortho.value = 1 - smooth(0, 0.6, tt)
        s.lens = 0
        if (s.satAt === null) s.satAt = t
        if (k >= 1) {
          s.drift = 0
          go(gates.proceed ? "panel" : "wait")
        }
        break
      }
      case "wait": {
        s.drift += dt * 0.05
        follow(sourcesPose(), 2.5)
        if (gates.proceed) {
          s.drift = 0
          go("panel")
        }
        break
      }
      case "panel": {
        const k = clamp01(tt / PANEL_S)
        const target = finalPose()
        if (s.from && target) lerpPose(p, s.from, target, 1 - Math.pow(1 - k, 3))
        if (k >= 1) go("done")
        break
      }
      case "done": {
        const target = finalPose()
        if (target) lerpPose(p, target, target, 1)
        break
      }
    }
    applyPose(camera, scene, p)
    if (rect) applyViewRect(camera, rect, vw, vh, frame.current)

    const path = flightPath.current
    if (path) {
      camera.updateMatrixWorld()
      pinScreen.set(0, SLAB + 1.6, 0).project(camera)
      const px = ((pinScreen.x + 1) / 2) * size.width
      const py = ((1 - pinScreen.y) / 2) * size.height
      const sx = size.width * 0.1
      const sy = size.height * 0.2
      const dx = px - sx
      const dy = py - sy
      path.setAttribute("d", `M${sx} ${sy} C ${sx + dx * 0.45} ${sy - Math.abs(dy) * 0.25}, ${sx + dx * 0.8} ${sy + dy * 0.2}, ${px} ${py}`)
    }
  })
  return null
}

export type JourneyCanvasProps = {
  panelRect?: PanelRect | null
  pin: { lat: number; lon: number } | null
  scene: ParcelScene | null
  analysis: Analysis | null
  proceed: boolean
  crop: CropId
  mode: SceneMode
  onPhase: (phase: JourneyPhase) => void
  onOrtho?: (ready: boolean) => void
  onReady?: () => void
  className?: string
}

function orthoUrl(scene: ParcelScene) {
  if (!scene.center2180) return null
  const [cx, cy] = scene.center2180
  const h = scene.halfExtentM
  return (
    "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution?" +
    new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: "1.1.1",
      LAYERS: "Raster",
      STYLES: "",
      SRS: "EPSG:2180",
      BBOX: [cx - h, cy - h, cx + h, cy + h].map((v) => v.toFixed(1)).join(","),
      WIDTH: "800",
      HEIGHT: "800",
      FORMAT: "image/jpeg",
    })
  )
}

export function JourneyCanvas({ panelRect = null, pin, scene, analysis, proceed, crop, mode, onPhase, onOrtho, onReady, className }: JourneyCanvasProps) {
  const world = useMemo(() => (scene ? createWorld(scene) : null), [scene])
  const [quality, setQuality] = useState<Quality>(initialQuality)
  const [times, setTimes] = useState<{ phase: JourneyPhase; trace: number; sources: number }>({ phase: "search", trace: Infinity, sources: Infinity })
  const [ortho, setOrtho] = useState<{ scene: ParcelScene; tex: THREE.Texture | null } | null>(null)
  const stageRef = useRef<Stage | null>(null)
  const flightPath = useRef<SVGPathElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const time = useMemo(() => createTimeUniforms(), [])
  const orthoMix = useMemo(() => ({ value: 1 }), [])
  const cloudTex = useMemo(() => (typeof document === "undefined" ? null : cloudTexture()), [])
  useEffect(() => () => cloudTex?.dispose(), [cloudTex])
  const lens = useMemo(
    () =>
      makeClouds(
        18,
        3,
        (r) => {
          const a = r() * Math.PI * 2
          const d = 2 + r() * 13
          return [Math.cos(a) * d, 6 + r() * 20, Math.sin(a) * d]
        },
        [8, 15],
        0.95,
      ),
    [],
  )

  useEffect(() => {
    if (!scene) return
    const url = orthoUrl(scene)
    let alive = true
    let loaded: THREE.Texture | null = null
    const give = (tex: THREE.Texture | null) => {
      if (!alive) return
      alive = false
      setOrtho({ scene, tex })
      onOrtho?.(!!tex)
    }
    const timer = window.setTimeout(() => give(null), url ? 1600 : 0)
    if (url) {
      new THREE.TextureLoader().load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          if (!alive) return tex.dispose()
          loaded = tex
          give(tex)
        },
        undefined,
        () => give(null),
      )
    }
    return () => {
      alive = false
      window.clearTimeout(timer)
      loaded?.dispose()
    }
  }, [scene, onOrtho])

  const pinXZ = useMemo<[number, number] | null>(() => (pin ? projectLonLat(pin.lon, pin.lat) : null), [pin])
  const orthoDone = !!scene && ortho?.scene === scene
  const gates = useMemo<Gates>(() => ({ pin: pinXZ, world: orthoDone ? world : null, proceed, mode, panel: panelRect }), [pinXZ, world, orthoDone, proceed, mode, panelRect])
  const showPath = !!pin && !phaseAtLeast(times.phase, "trace")
  const orthoTex = ortho?.tex ?? null
  const orthoProp = useMemo(() => ({ map: orthoTex, mix: orthoMix }), [orthoTex, orthoMix])

  return (
    <div ref={frame} className={cn("relative", panelRect && "bg-[linear-gradient(180deg,#FBE8C6_0%,#F6DDB2_45%,#F1D6A8_100%)]", className)}>
      <Canvas
        frameloop="always"
        dpr={quality === "high" ? [1, 2] : 1}
        shadows={quality === "high" ? "percentage" : false}
        flat
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 32, near: 0.1, far: 600, position: [0, 80, 60] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          const s = newStage()
          s.ortho = orthoMix
          stageRef.current = s
        }}
      >
        <FpsWatch quality={quality} onLow={() => setQuality("low")} onStill={() => undefined} />
        <SceneLights shadows={quality === "high"} />
        <Ticker time={time} animate />
        <Director
          stageRef={stageRef}
          gates={gates}
          flightPath={flightPath}
          frame={frame}
          onPhase={(phase, at) => {
            setTimes((prev) => ({ phase, trace: phase === "trace" ? at : prev.trace, sources: phase === "sources" ? at : prev.sources }))
            onPhase(phase)
          }}
        />
        {cloudTex && <PolandMap stageRef={stageRef} texture={cloudTex} />}
        <Pin stageRef={stageRef} />
        {cloudTex && <CloudLayer clouds={lens} texture={cloudTex} stageRef={stageRef} factor={(s) => s.lens} />}
        {world && phaseAtLeast(times.phase, "trace") && (
          <>
            <IslandRiser stageRef={stageRef}>
              <ParcelWorld
                world={world}
                crop={crop}
                analysis={analysis}
                mode={mode}
                animate
                quality={quality}
                time={time}
                outlineAt={times.trace + 0.05}
                cropAt={times.sources + 0.25}
                actors={phaseAtLeast(times.phase, "sources")}
                ortho={orthoProp}
              />
            </IslandRiser>
            <Satellite stageRef={stageRef} />
          </>
        )}
        <FirstFrame onReady={onReady} />
      </Canvas>
      <svg aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500", showPath ? "opacity-100" : "opacity-0")}>
        <path ref={flightPath} stroke="#2A2118" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="6 8">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" />
        </path>
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-[20%] left-[10%] flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-paper transition-opacity duration-500",
          showPath ? "opacity-100" : "opacity-0",
        )}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 5h8M5 1v8" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    </div>
  )
}
