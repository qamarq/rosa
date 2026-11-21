"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useLiteMode } from "@/components/lite-mode"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

export function useStaticMotion(): boolean {
  const { lite } = useLiteMode()
  const reduced = useReducedMotion()
  return lite || reduced
}

export type RevealState = "load" | "hidden" | "shown"

export function useReveal<T extends Element>() {
  const ref = useRef<T>(null)
  const [state, setState] = useState<RevealState>("load")
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    let first = true
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (first) {
          first = false
          if (!visible) setState("hidden")
          else io.disconnect()
          return
        }
        if (visible) {
          setState("shown")
          io.disconnect()
        }
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, state] as const
}

export function scrollBehavior(staticMotion: boolean): ScrollBehavior {
  return staticMotion ? "auto" : "smooth"
}
