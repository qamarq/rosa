"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useLiteMode } from "@/components/lite-mode"
import { useReducedMotion } from "@/components/result/motion"
import type { ParcelScene } from "@/lib/scene3d"
import type { Analysis, CropId, SceneMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SceneActors } from "./actors"
import { CameraRig, clampZoom, FLY_IN_S, type CameraState } from "./camera-rig"
import type { SceneWeather } from "./contract"
import { CropField, rowGapFor } from "./crop-field"
import { SceneErrorBoundary } from "./error-boundary"
import { drawGround } from "./ground-texture"
import { createTimeUniforms, setUniform, type TimeUniforms } from "./materials"
import { ParcelOutline } from "./parcel-outline"
import { Terrain } from "./terrain"
import { Water } from "./water"
import { closestOnLine, createWorld, type World } from "./world"

export type Quality = "high" | "low"

const PLANTS = { high: 9000, low: 3200 }
const FOG = "#F1D6A8"

export function initialQuality(): Quality {
  if (typeof window === "undefined") return "low"
  const coarse = window.matchMedia("(pointer: coarse)").matches
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  return coarse || cores <= 4 || memory <= 4 ? "low" : "high"
}

export function Ticker({ time, animate }: { time: TimeUniforms; animate: boolean }) {
  const nextGust = useRef(4)
  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.elapsedTime
    setUniform(time.uTime, t)
    if (t > nextGust.current) {
      setUniform(time.uGustStart, t)
      nextGust.current = t + 6 + Math.random() * 3
    }
  })
  return null
}

export function FpsWatch({ quality, onLow, onStill }: { quality: Quality; onLow: () => void; onStill: () => void }) {
  const acc = useRef({ start: -1, last: -1, frames: 0 })
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = acc.current
    if (t < FLY_IN_S + 1) return
    if (a.start < 0 || t - a.last > 0.5) {
      a.start = t
      a.last = t
      a.frames = 0
      return
    }
    a.last = t
    a.frames += 1
    if (t - a.start < 2) return
    const fps = a.frames / (t - a.start)
    a.start = t
    a.frames = 0
    if (quality === "high" && fps < 48) onLow()
    else if (quality === "low" && fps < 28) onStill()
  })
  return null
}

export function FirstFrame({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 1) requestAnimationFrame(() => onReady?.())
  })
  return null
}

export type Label = { key: string; at: [number, number, number]; text: string; detail?: string | null; water?: boolean }

function sceneLabels(world: World, analysis: Analysis): Label[] {
  const areaHa = analysis.parcel.areaHa
  const slopePct = analysis.scene?.slopePct ?? null
  const fmt = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 1 })
  const out: Label[] = [
    {
      key: "parcel",
      at: world.toWorld(world.parcelCenter[0], world.parcelCenter[1], 0.45),
      text: areaHa ? `Twoja działka · ${fmt(areaHa)} ha` : "Twoja działka",
      detail: slopePct != null && slopePct >= 0.5 ? `spadek ${fmt(slopePct)}%` : null,
    },
  ]
  const ditch = world.nearestDitch && world.nearestDitch.distanceM < world.halfM * 0.3 ? world.nearestDitch : null
  if (ditch) {
    const [x, y] = closestOnLine(ditch.points, world.lowestParcelPoint[0], world.lowestParcelPoint[1])
    out.push({ key: "ditch", at: world.toWorld(x, y, 0.12), text: ditch.kind === "ciek" ? "Ciek" : ditch.kind === "kanał" ? "Kanał" : "Rów melioracyjny", water: true })
  }
  return out
}

export function LabelTracker({ labels, nodes }: { labels: Label[]; nodes: React.RefObject<(HTMLDivElement | null)[]> }) {
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld()
    labels.forEach((label, i) => {
      const el = nodes.current[i]
      if (!el) return
      const p = new THREE.Vector3(...label.at).project(camera)
      el.style.transform = `translate(${((p.x + 1) / 2) * size.width}px, ${((1 - p.y) / 2) * size.height}px) translate(-50%, -100%)`
      el.style.visibility = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 ? "visible" : "hidden"
    })
  })
  return null
}

export function weatherOf(analysis: Analysis | null): SceneWeather {
  const level = analysis?.status.level ?? 2
  return {
    level,
    hot: !!analysis && (analysis.causes.some((c) => c.kind === "upal") || /upał/i.test(analysis.status.headline)),
    dry: level >= 3,
    wet: level <= 1,
  }
}

export function SceneLights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <fog attach="fog" args={[FOG, 30, 80]} />
      <hemisphereLight args={["#FFF1D6", "#A9773F", 1.15]} />
      <ambientLight color="#FFE9C4" intensity={0.25} />
      <directionalLight
        position={[-9, 8.5, 7]}
        color="#FFD7A0"
        intensity={2.1}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
      <directionalLight position={[8, 5, -6]} color="#BFE3E6" intensity={0.35} />
    </>
  )
}

function ActorScaler({ factor, children }: { factor?: { value: number }; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const applied = useRef({ value: 1, count: 0 })
  useFrame(() => {
    const g = group.current
    if (!g || !factor) return
    const nodes: THREE.Object3D[] = []
    g.traverse((o) => {
      if (typeof o.userData.actorScale === "number") nodes.push(o)
    })
    const f = factor.value
    if (Math.abs(f - applied.current.value) < 1e-4 && nodes.length === applied.current.count) return
    applied.current = { value: f, count: nodes.length }
    nodes.forEach((o) => o.scale.setScalar(o.userData.actorScale * f))
  })
  return <group ref={group}>{children}</group>
}

export type ParcelWorldProps = {
  world: World
  crop: CropId
  analysis: Analysis | null
  mode: SceneMode
  animate: boolean
  quality: Quality
  time: TimeUniforms
  outlineAt: number
  cropAt: number
  actors: boolean
  actorScale?: { value: number }
  ortho?: { map: THREE.Texture | null; mix: { value: number } }
}

export function ParcelWorld({ world, crop, analysis, mode, animate, quality, time, outlineAt, cropAt, actors, actorScale, ortho }: ParcelWorldProps) {
  const gl = useThree((s) => s.gl)
  const level = analysis?.status.level ?? 2
  const ndvi = analysis?.vegetation?.ndvi ?? null
  const target = PLANTS[quality]
  const rowGapM = rowGapFor(world, target)
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawGround(world, { size: quality === "high" ? 2048 : 1024, level, rowGapM, ditchWidthM: 7 }))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return tex
  }, [world, quality, level, rowGapM, gl])
  useEffect(() => () => texture.dispose(), [texture])
  const weather = useMemo(() => weatherOf(analysis), [analysis])
  const shadows = quality === "high"

  return (
    <>
      <Terrain world={world} texture={texture} quality={quality} ortho={ortho} />
      <Water world={world} time={time} level={level} />
      <CropField world={world} crop={crop} ndvi={ndvi} level={level} target={target} time={time} animate={animate} shadows={shadows} revealAt={cropAt} />
      <ParcelOutline world={world} animate={animate} revealAt={outlineAt} />
      {actors && (
        <SceneErrorBoundary>
          <ActorScaler factor={actorScale}>
            <SceneActors ctx={world} mode={mode} crop={crop} weather={weather} ndvi={ndvi} animate={animate} quality={quality} />
          </ActorScaler>
        </SceneErrorBoundary>
      )}
    </>
  )
}

function World3D({
  world,
  analysis,
  mode,
  camera,
  tilt,
  animate,
  quality,
  intro,
}: {
  world: World
  analysis: Analysis
  mode: SceneMode
  camera: CameraState
  tilt: number
  animate: boolean
  quality: Quality
  intro: boolean
}) {
  const time = useMemo(() => createTimeUniforms(), [])
  const actorScale = useMemo(() => ({ value: 1 }), [])
  return (
    <>
      <SceneLights shadows={quality === "high"} />
      <Ticker time={time} animate={animate} />
      <CameraRig world={world} mode={mode} camera={camera} tilt={tilt} animate={animate} intro={intro} actorScale={actorScale} />
      <ParcelWorld
        world={world}
        crop={analysis.request.crop}
        analysis={analysis}
        mode={mode}
        animate={animate}
        quality={quality}
        time={time}
        outlineAt={intro ? FLY_IN_S * 0.45 : -10}
        cropAt={intro ? FLY_IN_S * 0.7 : -10}
        actors
        actorScale={actorScale}
      />
    </>
  )
}

export type ParcelScene3DProps = {
  scene: ParcelScene
  analysis: Analysis
  mode: SceneMode
  camera: CameraState
  onRotate: (deg: number) => void
  onZoom?: (zoom: number) => void
  labels?: boolean
  onReady?: () => void
  onError?: () => void
  intro?: boolean
  className?: string
}

export function ParcelScene3D({ scene, analysis, mode, camera, onRotate, onZoom, labels = false, onReady, onError, intro = true, className }: ParcelScene3DProps) {
  const { lite } = useLiteMode()
  const reduced = useReducedMotion()
  const [still, setStill] = useState(false)
  const animate = !lite && !reduced && !still
  const world = useMemo(() => createWorld(scene), [scene])
  const [quality, setQuality] = useState<Quality>(initialQuality)
  const [tilt, setTilt] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [inView, setInView] = useState(true)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; rot: number; tilt: number; captured: boolean } | null>(null)
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const zoomNow = useRef(camera.zoom)
  const zoomCb = useRef(onZoom)
  const labelNodes = useRef<(HTMLDivElement | null)[]>([])
  const labelList = useMemo(() => (labels ? sceneLabels(world, analysis) : []), [labels, world, analysis])
  const [labelsShown, setLabelsShown] = useState(!animate || !intro)

  useEffect(() => {
    if (labelsShown) return
    const timer = window.setTimeout(() => setLabelsShown(true), FLY_IN_S * 1000)
    return () => window.clearTimeout(timer)
  }, [labelsShown])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { threshold: 0.01 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    zoomNow.current = camera.zoom
    zoomCb.current = onZoom
  }, [camera.zoom, onZoom])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const cb = zoomCb.current
      if (!cb) return
      e.preventDefault()
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
      const next = clampZoom(zoomNow.current * Math.exp(-delta * (e.ctrlKey ? 0.012 : 0.0016)))
      zoomNow.current = next
      cb(next)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const spread = () => {
    const [a, b] = [...touches.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const end = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
    drag.current = null
    setDragging(false)
  }

  return (
    <div
      ref={wrapRef}
      data-dragging={dragging}
      className={cn(
        "relative isolate touch-pan-y bg-[linear-gradient(180deg,#FBE8C6_0%,#F6DDB2_45%,#F1D6A8_100%)] select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return
        if (e.pointerType === "touch") {
          touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (touches.current.size === 2 && onZoom) {
            pinch.current = { dist: spread(), zoom: camera.zoom }
            drag.current = null
            setDragging(false)
            return
          }
        }
        drag.current = { x: e.clientX, y: e.clientY, rot: camera.rotation, tilt, captured: false }
      }}
      onPointerMove={(e) => {
        if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pz = pinch.current
        if (pz) {
          const dist = spread()
          if (pz.dist > 0 && dist > 0) onZoom?.(clampZoom(pz.zoom * (dist / pz.dist)))
          return
        }
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        const dy = e.clientY - d.y
        if (!d.captured) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
          d.captured = true
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
        }
        onRotate(Math.max(-60, Math.min(60, d.rot + dx * 0.22)))
        if (e.pointerType === "mouse") setTilt(Math.max(-18, Math.min(24, d.tilt + dy * 0.15)))
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <Canvas
        frameloop={animate && inView ? "always" : "demand"}
        dpr={quality === "high" ? [1, 2] : 1}
        shadows={quality === "high" ? "percentage" : false}
        flat
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 32, near: 0.1, far: 220, position: [0, 30, 20] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          const ctx = gl.getContext()
          const info = ctx.getExtension("WEBGL_debug_renderer_info")
          const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""
          if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) setQuality("low")
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault()
            onError?.()
          })
        }}
      >
        {animate && <FpsWatch quality={quality} onLow={() => setQuality("low")} onStill={() => setStill(true)} />}
        <World3D world={world} analysis={analysis} mode={mode} camera={camera} tilt={tilt} animate={animate} quality={quality} intro={intro} />
        {labelList.length > 0 && <LabelTracker labels={labelList} nodes={labelNodes} />}
        <FirstFrame onReady={onReady} />
      </Canvas>
      {labelList.map((label, i) => (
        <div
          key={label.key}
          ref={(el) => {
            labelNodes.current[i] = el
          }}
          className={cn(
            "pointer-events-none absolute top-0 left-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold whitespace-nowrap shadow-[0_8px_20px_-10px_rgba(60,40,20,.5)] transition-opacity duration-500",
            label.water ? "bg-[#E6F4F5] text-water-deep" : "bg-paper/95 text-foreground",
            labelsShown ? "opacity-100" : "opacity-0",
          )}
          style={{ visibility: "hidden" }}
        >
          {label.water && <span aria-hidden="true" className="size-2 rounded-full bg-water" />}
          {label.text}
          {label.detail && <span className="font-semibold text-muted-foreground">· {label.detail}</span>}
        </div>
      ))}
    </div>
  )
}
