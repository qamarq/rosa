"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { Diorama, type SceneFacts } from "@/components/diorama/diorama"
import { useLiteMode } from "@/components/lite-mode"
import { SceneErrorBoundary } from "@/components/scene3d/error-boundary"
import { loadParcelScene, supportsWebGL } from "@/components/scene3d/load-scene"
import type { ParcelScene } from "@/lib/scene3d"
import type { Analysis, SceneMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import styles from "./result.module.css"

const ParcelScene3D = dynamic(() => import("@/components/scene3d/parcel-scene").then((m) => m.ParcelScene3D), { ssr: false })

export const ZOOM_LEVELS = [0.85, 1, 1.15, 1.3, 1.5]

export type Camera = { zoom: number; rotation: number; topView: boolean }

export function useCamera() {
  const [zoomIndex, setZoomIndex] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [topView, setTopView] = useState(false)
  return {
    camera: { zoom: ZOOM_LEVELS[zoomIndex], rotation, topView } satisfies Camera,
    canZoomIn: zoomIndex < ZOOM_LEVELS.length - 1,
    canZoomOut: zoomIndex > 0,
    zoomIn: () => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1)),
    zoomOut: () => setZoomIndex((i) => Math.max(0, i - 1)),
    setRotation,
    toggleTopView: () => setTopView((v) => !v),
  }
}

function useHasSize(ref: React.RefObject<HTMLElement | null>) {
  const [has, setHas] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHas(entry.contentRect.width > 0 && entry.contentRect.height > 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return has
}

function SvgStage({
  mode,
  labels,
  facts,
  camera,
  onRotate,
  className,
}: {
  mode: SceneMode
  labels: boolean
  facts?: SceneFacts
  camera: Camera
  onRotate: (deg: number) => void
  className?: string
}) {
  const drag = useRef<{ x: number; start: number; captured: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div className={className} style={{ containerType: "size" }}>
      <div
        data-dragging={dragging}
        className={cn(styles.stage, "mx-auto flex h-full items-center justify-center")}
        style={{
          transform: `perspective(1600px) rotateX(${camera.topView ? 28 : 0}deg) rotateY(${Math.max(-24, Math.min(24, camera.rotation))}deg) scale(${camera.zoom})`,
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return
          drag.current = { x: e.clientX, start: camera.rotation, captured: false }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = e.clientX - drag.current.x
          if (!drag.current.captured) {
            if (Math.abs(dx) < 4) return
            drag.current.captured = true
            e.currentTarget.setPointerCapture(e.pointerId)
            setDragging(true)
          }
          const next = drag.current.start + dx * 0.12
          onRotate(Math.max(-24, Math.min(24, next)))
        }}
        onPointerUp={() => {
          drag.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragging(false)
        }}
      >
        <Diorama mode={mode} labels={labels} facts={facts} className="w-[min(100cqw,calc(100cqh*1.40625))] select-none" />
      </div>
    </div>
  )
}

type Phase = "loading" | "shown" | "done"

export function DioramaStage({
  analysis,
  mode,
  labels,
  facts,
  camera,
  onRotate,
  className,
}: {
  analysis: Analysis
  mode: SceneMode
  labels: boolean
  facts?: SceneFacts
  camera: Camera
  onRotate: (deg: number) => void
  className?: string
}) {
  const { lite } = useLiteMode()
  const hostRef = useRef<HTMLDivElement>(null)
  const visible = useHasSize(hostRef)
  const [webgl] = useState(() => typeof window !== "undefined" && supportsWebGL())
  const [loaded, setLoaded] = useState<{ id: string; scene: ParcelScene | null } | null>(null)
  const [phase, setPhase] = useState<Phase>("loading")
  const [failed, setFailed] = useState(false)
  const want3d = webgl && !lite && visible && !failed

  useEffect(() => {
    if (!want3d) return
    let alive = true
    loadParcelScene(analysis.id).then((scene) => {
      if (alive) setLoaded({ id: analysis.id, scene })
    })
    return () => {
      alive = false
    }
  }, [want3d, analysis.id])

  const scene = loaded?.id === analysis.id ? loaded.scene : null
  const active = want3d && !!scene
  const shown = active && (phase === "shown" || phase === "done")

  useEffect(() => {
    if (!active || phase !== "loading") return
    const timer = window.setTimeout(() => setFailed(true), 12000)
    return () => window.clearTimeout(timer)
  }, [active, phase])

  useEffect(() => {
    if (phase !== "shown") return
    const timer = window.setTimeout(() => setPhase("done"), 700)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <>
      {!(active && phase === "done") && (
        <SvgStage
          mode={mode}
          labels={labels}
          facts={facts}
          camera={camera}
          onRotate={onRotate}
          className={cn(className, "transition-opacity duration-700", shown && "pointer-events-none opacity-0")}
        />
      )}
      <div ref={hostRef} aria-hidden={!active || undefined} className={cn("absolute inset-0 transition-opacity duration-700", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
        {active && scene && (
          <SceneErrorBoundary
            onError={() => {
              setFailed(true)
              setPhase("loading")
            }}
          >
            <ParcelScene3D
              scene={scene}
              analysis={analysis}
              mode={mode}
              camera={camera}
              onRotate={onRotate}
              labels={labels}
              onReady={() => setPhase((p) => (p === "loading" ? "shown" : p))}
              onError={() => {
                setFailed(true)
                setPhase("loading")
              }}
              className="h-full w-full"
            />
          </SceneErrorBoundary>
        )}
      </div>
    </>
  )
}
