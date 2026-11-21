"use client"

import { useEffect, useRef, useState } from "react"
import { numberPl } from "./format"
import { useStaticMotion } from "./motion"

const DURATION = 900

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const staticMotion = useStaticMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [current, setCurrent] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (staticMotion || !el || typeof IntersectionObserver === "undefined") return
    let raf = 0
    let failsafe = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        if (document.visibilityState !== "visible") return
        failsafe = window.setTimeout(() => {
          cancelAnimationFrame(raf)
          setCurrent(null)
        }, DURATION + 400)
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION)
          setCurrent(value * easeOutExpo(t))
          if (t < 1) raf = requestAnimationFrame(tick)
          else setCurrent(null)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.clearTimeout(failsafe)
    }
  }, [value, staticMotion])

  const shown = staticMotion || current === null ? value : current

  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {prefix}
        {numberPl(shown, decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {numberPl(value, decimals)}
        {suffix}
      </span>
    </>
  )
}
