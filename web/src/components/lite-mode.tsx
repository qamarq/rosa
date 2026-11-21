"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"

type LiteMode = { lite: boolean; auto: boolean; setLite: (value: boolean) => void; toggle: () => void }

const LiteModeContext = createContext<LiteMode | null>(null)

const STORAGE_KEY = "rosa-lite"
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
const listeners = new Set<() => void>()

type Connection = { saveData?: boolean; effectiveType?: string }

function detectAutoLite(): boolean {
  const reduced = window.matchMedia(REDUCED_MOTION).matches
  const conn = (navigator as Navigator & { connection?: Connection }).connection
  const slow = !!conn && (conn.saveData === true || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")
  return reduced || slow
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const media = window.matchMedia(REDUCED_MOTION)
  media.addEventListener("change", onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    media.removeEventListener("change", onChange)
    window.removeEventListener("storage", onChange)
  }
}

function getSnapshot(): string {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === "1" ? "on" : "off"
  return detectAutoLite() ? "auto" : "off"
}

function getServerSnapshot(): string {
  return "off"
}

export function LiteModeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const lite = snapshot !== "off"
  const auto = snapshot === "auto"

  useEffect(() => {
    document.documentElement.classList.toggle("rosa-lite", lite)
  }, [lite])

  const setLite = useCallback((value: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0")
    listeners.forEach((listener) => listener())
  }, [])

  const value = useMemo(() => ({ lite, auto, setLite, toggle: () => setLite(!lite) }), [lite, auto, setLite])

  return <LiteModeContext.Provider value={value}>{children}</LiteModeContext.Provider>
}

export function useLiteMode(): LiteMode {
  const ctx = useContext(LiteModeContext)
  if (!ctx) throw new Error("useLiteMode must be used inside LiteModeProvider")
  return ctx
}
