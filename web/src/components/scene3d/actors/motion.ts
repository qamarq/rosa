import { createContext, useContext, useRef } from "react"
import type { RefObject } from "react"
import { useFrame } from "@react-three/fiber"
import type { RootState } from "@react-three/fiber"

export type ActorClock = { t: number; animate: boolean }

export const STATIC_T = 60

export const ClockContext = createContext<RefObject<ActorClock> | null>(null)
export const ShadowContext = createContext(false)

export function useActorFrame(fn: (t: number, state: RootState, dt: number, animate: boolean) => void) {
  const clockRef = useContext(ClockContext)
  const done = useRef<ActorClock | null>(null)
  useFrame((state, dt) => {
    const clock = clockRef?.current ?? { t: STATIC_T, animate: false }
    if (!clock.animate) {
      if (done.current === clock) return
      done.current = clock
    }
    fn(clock.t, state, Math.min(dt, 0.1), clock.animate)
  })
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeOutBack = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
export const springOut = (x: number) => (x <= 0 ? 0 : 1 - Math.exp(-6.5 * x) * Math.cos(11 * x))
export const fract = (x: number) => x - Math.floor(x)

export const HOP_DURATION = 1.1

export type Hop = { lift: number; sy: number }

export function hopInto(out: Hop, t: number): Hop {
  out.lift = 0
  out.sy = 1
  if (t < 0 || t > HOP_DURATION) return out
  const p = t / HOP_DURATION
  if (p < 0.16) {
    out.sy = 1 - 0.06 * Math.sin((Math.PI * p) / 0.32)
  } else if (p < 0.62) {
    const q = (p - 0.16) / 0.46
    out.lift = 4 * q * (1 - q)
    out.sy = 1 + 0.06 * Math.cos(Math.PI * q * 0.5) * (1 - q)
  } else {
    const q = (p - 0.62) / 0.38
    out.sy = 1 - 0.06 * Math.exp(-4 * q) * Math.cos(13 * q)
  }
  return out
}

export const breath = (t: number, phase = 0) => 1 + 0.018 * Math.sin(((t + phase) / 2.4) * Math.PI * 2)

export function angleLerp(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
