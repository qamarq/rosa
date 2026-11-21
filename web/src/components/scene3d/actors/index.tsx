"use client"

import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useLiteMode } from "@/components/lite-mode"
import type { SceneMode } from "@/lib/types"
import type { SceneActorsProps, Vec3, WorldContext } from "../contract"
import { Dog, Farmer } from "./characters"
import { Dew, Dust, Rain, Shimmer, SunGlow, WaterFlow } from "./effects"
import { Barn, Silo, Tree } from "./farmstead"
import { computeLayout, farmerSpot } from "./layout"
import type { Layout, P } from "./layout"
import { ClockContext, ShadowContext, STATIC_T } from "./motion"
import type { ActorClock } from "./motion"
import { MIEDZYPLON_START, miedzyplonPass, Miedzyplon, NAWADNIANIE, Nawadnianie, ParkedTractor, Zastawka, ZASTAWKA } from "./scenarios"

const REDUCED = "(prefers-reduced-motion: reduce)"

function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED)
  m.addEventListener("change", cb)
  return () => m.removeEventListener("change", cb)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

const layoutCache = new WeakMap<WorldContext, Layout>()

function layoutFor(ctx: WorldContext) {
  let layout = layoutCache.get(ctx)
  if (!layout) {
    layout = computeLayout(ctx)
    layoutCache.set(ctx, layout)
  }
  return layout
}

export function getActorFocus(ctx: WorldContext, mode: SceneMode): [number, number] {
  const layout = layoutFor(ctx)
  if (mode === "zastawka") return layout.gate.pos
  if (mode === "nawadnianie") return layout.sprinkler
  if (mode === "miedzyplon") return layout.inner
  return layout.home
}

function world(ctx: WorldContext, p: P): Vec3 {
  return ctx.toWorld(p[0], p[1])
}

export function SceneActors({ ctx, mode, weather, ndvi, animate, quality }: SceneActorsProps) {
  const reduced = useReducedMotion()
  const { lite } = useLiteMode()
  const live = animate && !reduced && !lite
  const layout = useMemo(() => layoutFor(ctx), [ctx])
  const clock = useRef<ActorClock>({ t: live ? 0 : STATIC_T, animate: live })
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    clock.current = { t: live ? 0 : STATIC_T, animate: live }
    invalidate()
  }, [mode, live, invalidate])

  useFrame((_, dt) => {
    const c = clock.current
    if (c.animate) c.t += Math.min(dt, 0.1)
  }, -1)

  const { kc, km, kb, toy } = layout
  const spots = useMemo(() => farmerSpot(ctx, layout, mode), [ctx, layout, mode])
  const farmerAt = useMemo(() => world(ctx, spots.farmer), [ctx, spots])
  const dogAt = useMemo(() => world(ctx, spots.dog), [ctx, spots])
  const parked = useMemo(() => (layout.parked ? { position: world(ctx, layout.parked.pos), yaw: layout.parked.yaw } : null), [ctx, layout])
  const centre = useMemo(() => world(ctx, layout.inner), [ctx, layout])

  const happyAt = useMemo(() => {
    if (mode === "zastawka") return ZASTAWKA.happy
    if (mode === "nawadnianie") return NAWADNIANIE.happy
    if (mode === "miedzyplon") {
      let len = 0
      for (let i = 1; i < layout.path.length; i++) len += Math.hypot(layout.path[i][0] - layout.path[i - 1][0], layout.path[i][1] - layout.path[i - 1][1])
      return MIEDZYPLON_START + miedzyplonPass(len, toy) + 0.3
    }
    return null
  }, [mode, layout, toy])

  const high = quality === "high"
  const dry = weather.level >= 4 || (ndvi !== null && ndvi < 0.3)
  const worried = mode === "susza" || weather.level >= 3

  return (
    <ClockContext.Provider value={clock}>
      <ShadowContext.Provider value={high}>
        {layout.barn && (
          <group position={world(ctx, layout.barn.pos)} rotation={[0, layout.barn.yaw, 0]} scale={kb} userData={{ actorScale: kb }}>
            <Barn />
          </group>
        )}
        {layout.silo && (
          <group position={world(ctx, layout.silo.pos)} scale={kb} userData={{ actorScale: kb }}>
            <Silo />
          </group>
        )}
        {layout.trees.map((tree, i) => (
          <group key={i} position={world(ctx, tree.pos)} rotation={[0, tree.yaw, 0]} scale={kb * tree.scale} userData={{ actorScale: kb * tree.scale }}>
            <Tree seed={i} dry={dry} />
          </group>
        ))}
        <Farmer position={farmerAt} scale={kc} worried={worried} wipe={weather.level >= 3} happyAt={happyAt} />
        <Dog position={dogAt} scale={kc} happyAt={happyAt} />
        {mode !== "miedzyplon" && parked && <ParkedTractor position={parked.position} yaw={parked.yaw} scale={km} />}
        {mode === "zastawka" && <Zastawka ctx={ctx} layout={layout} />}
        {mode === "miedzyplon" && <Miedzyplon ctx={ctx} layout={layout} quality={quality} />}
        {mode === "nawadnianie" && <Nawadnianie ctx={ctx} layout={layout} quality={quality} />}
        <WaterFlow ctx={ctx} layout={layout} count={high ? 400 : 150} />
        {weather.wet && <Rain ctx={ctx} layout={layout} count={high ? 520 : 200} />}
        {weather.hot && <SunGlow target={centre} />}
        {mode === "susza" && weather.hot && <Shimmer ctx={ctx} layout={layout} count={high ? 5 : 3} />}
        {mode === "susza" && <Dust ctx={ctx} layout={layout} count={high ? 36 : 16} focus={spots.farmer} />}
        {mode === "hero" && <Dew ctx={ctx} layout={layout} count={high ? 70 : 30} />}
      </ShadowContext.Provider>
    </ClockContext.Provider>
  )
}
