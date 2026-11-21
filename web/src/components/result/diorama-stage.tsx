"use client"

import { useRef, useState } from "react"
import { Diorama, type SceneFacts } from "@/components/diorama/diorama"
import type { SceneMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import styles from "./result.module.css"

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

export function DioramaStage({
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
          transform: `perspective(1600px) rotateX(${camera.topView ? 28 : 0}deg) rotateY(${camera.rotation}deg) scale(${camera.zoom})`,
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
