"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { useLiteMode } from "@/components/lite-mode"
import { cn } from "@/lib/utils"
import type { SceneMode } from "@/lib/types"
import { DioramaScene, type SceneFacts } from "./diorama-scene"
import styles from "./diorama.module.css"
import { buildScene } from "./scene-data"

export type DioramaProps = {
  mode: SceneMode
  labels?: boolean
  animate?: boolean
  facts?: SceneFacts
  className?: string
}

type Layer = { mode: SceneMode; entering: boolean; leaving: boolean }

const FADE_MS = 520

function SceneLayer({ layer, labels, uid, facts }: { layer: Layer; labels: boolean; uid: string; facts?: SceneFacts }) {
  const v = useMemo(() => buildScene(layer.mode), [layer.mode])
  return (
    <svg
      viewBox="0 0 900 640"
      width="100%"
      className={cn(styles.layer, "block h-full w-full overflow-visible", layer.entering && styles.enter, layer.leaving && "pointer-events-none")}
      role={layer.leaving ? undefined : "img"}
      aria-label={layer.leaving ? undefined : v.ariaLabel}
      aria-hidden={layer.leaving || undefined}
    >
      <DioramaScene v={v} uid={uid + layer.mode + "-"} labels={labels} facts={facts} />
    </svg>
  )
}

export function Diorama({ mode, labels = true, animate = true, facts, className }: DioramaProps) {
  const { lite } = useLiteMode()
  const still = lite || !animate
  const uid = "rosa" + useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const [shown, setShown] = useState(mode)
  const [layers, setLayers] = useState<Layer[]>([{ mode, entering: false, leaving: false }])

  if (mode !== shown) {
    setShown(mode)
    setLayers((prev) =>
      still
        ? [{ mode, entering: false, leaving: false }]
        : [
            ...prev.filter((l) => l.mode !== mode).map((l) => ({ ...l, leaving: true })),
            { mode, entering: true, leaving: false },
          ],
    )
  }

  const hasLeaving = layers.some((l) => l.leaving)
  useEffect(() => {
    if (!hasLeaving) return
    const timer = window.setTimeout(() => setLayers((prev) => prev.filter((l) => !l.leaving)), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [hasLeaving, layers])

  return (
    <div
      className={cn(styles.root, "relative w-full", still && styles.static, className)}
      style={{ aspectRatio: "900 / 640" }}
      data-mode={mode}
      data-static={still || undefined}
    >
      {layers.map((layer) => (
        <SceneLayer key={layer.mode} layer={layer} labels={labels} uid={uid} facts={facts} />
      ))}
    </div>
  )
}

export type { SceneFacts }
