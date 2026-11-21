"use client"

import { useEffect, useState } from "react"
import type { DroughtLevel } from "@/lib/types"
import styles from "./farmer-logo.module.css"

type Emote = "drop" | "heart" | "thumb" | "sun" | "alert" | "cloud"

const EMOTES: Record<"happy" | "worried" | "hot", Emote[]> = {
  happy: ["heart", "drop", "thumb"],
  worried: ["cloud", "drop", "sun"],
  hot: ["sun", "alert", "drop"],
}

function moodOf(level: DroughtLevel | undefined): keyof typeof EMOTES {
  if (!level || level <= 2) return "happy"
  return level === 3 ? "worried" : "hot"
}

function EmoteGlyph({ emote }: { emote: Emote }) {
  switch (emote) {
    case "drop":
      return <path d="M7 1.5 C 5 4.3 3.5 6 3.5 7.6 a3.5 3.5 0 0 0 7 0 C 10.5 6 9 4.3 7 1.5Z" fill="#3FA3B0" />
    case "heart":
      return <path d="M7 11.2 C 3 8.6 2 6.6 2 5.1 a2.5 2.5 0 0 1 5 -0.6 a2.5 2.5 0 0 1 5 0.6 c0 1.5 -1 3.5 -5 6.1Z" fill="#E0605A" />
    case "thumb":
      return (
        <g fill="#E3A24A">
          <rect x="2" y="6" width="2.6" height="5.2" rx="1" />
          <path d="M5.2 6 L7 2.2 c0.8 -0.4 1.7 0.2 1.5 1.1 L8.1 5.5 h2.4 c0.9 0 1.5 0.8 1.3 1.6 l-0.8 3.1 c-0.2 0.6 -0.7 1 -1.3 1 H5.2Z" />
        </g>
      )
    case "sun":
      return (
        <g>
          <circle cx="7" cy="7" r="2.8" fill="#F4A93A" />
          <path d="M7 1.2v1.6M7 11.2v1.6M1.2 7h1.6M11.2 7h1.6M2.9 2.9l1.1 1.1M10 10l1.1 1.1M2.9 11.1l1.1-1.1M10 4l1.1-1.1" stroke="#E08A22" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )
    case "alert":
      return (
        <g>
          <circle cx="7" cy="7" r="5.5" fill="#D9822F" />
          <path d="M7 4v3.6" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="7" cy="10" r="1" fill="#FFF" />
        </g>
      )
    case "cloud":
      return <path d="M4 10.5 a2.6 2.6 0 0 1 0.3 -5.2 a3.2 3.2 0 0 1 6 0.9 a2.2 2.2 0 0 1 0 4.3Z" fill="#B9CBD3" />
  }
}

export function FarmerLogo({ size = 40, level }: { size?: number; level?: DroughtLevel }) {
  const mood = moodOf(level)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => setI((n) => n + 1), 2800)
    return () => window.clearInterval(timer)
  }, [])
  const emote = EMOTES[mood][i % EMOTES[mood].length]
  const mouth =
    mood === "happy" ? "M17 25.2 q3 2.6 6 0" : mood === "worried" ? "M17.2 26 q1.5 -1 3 0 t3 0" : "M17.4 26.6 q2.6 -2.2 5.2 0"

  return (
    <span className={styles.root} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 40 40">
        <ellipse cx="20" cy="38.2" rx="9" ry="1.4" fill="#2A2118" opacity="0.12" />
        <g className={styles.body}>
          <path d="M11 38 c0 -6 3.6 -9 9 -9 s9 3 9 9Z" fill="#2F6F8F" />
          <path d="M15.5 30.4 v7.6 M24.5 30.4 v7.6" stroke="#24566F" strokeWidth="1.6" />
          <g className={styles.arm}>
            <path d="M27.6 32 c2.2 -1.2 3.4 -3.6 3.6 -6.2" stroke="#2F6F8F" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <circle cx="31.3" cy="25" r="2" fill="#F0BE96" />
          </g>
          <circle cx="20" cy="21" r="8.6" fill="#F0BE96" />
          <circle cx="14.6" cy="23.6" r="1.6" fill="#E8907E" opacity="0.55" />
          <circle cx="25.4" cy="23.6" r="1.6" fill="#E8907E" opacity="0.55" />
          <g className={styles.eyes}>
            <ellipse cx="16.9" cy="20.6" rx="1.1" ry="1.4" fill="#2A2118" />
            <ellipse cx="23.1" cy="20.6" rx="1.1" ry="1.4" fill="#2A2118" />
          </g>
          <path d={mouth} stroke="#7A3B26" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          {mood === "hot" && <path className={styles.sweat} d="M27.6 15.4 c-0.9 1.4 -1.4 2.2 -1.4 2.9 a1.4 1.4 0 0 0 2.8 0 c0 -0.7 -0.5 -1.5 -1.4 -2.9Z" fill="#7CC6D6" />}
          <g className={styles.hat}>
            <ellipse cx="20" cy="14.6" rx="12.2" ry="2.8" fill="#E9B949" />
            <path d="M13.6 14.4 c0 -5.4 2.8 -7.6 6.4 -7.6 s6.4 2.2 6.4 7.6Z" fill="#F2C95C" />
            <path d="M13.8 12.6 h12.4" stroke="#C0573A" strokeWidth="1.8" />
          </g>
        </g>
        <g key={i} className={styles.emote} transform="translate(26 0)">
          <circle cx="7" cy="7" r="7" fill="#FFFDF8" stroke="#E3D3B8" strokeWidth="0.8" />
          <EmoteGlyph emote={emote} />
        </g>
      </svg>
    </span>
  )
}
