"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { ResultView } from "@/components/result/result-view"
import { SceneErrorBoundary } from "@/components/scene3d/error-boundary"
import { phaseAtLeast, type JourneyPhase, type PanelRect } from "@/components/scene3d/journey-scene"
import { beginHandoff, getHandoff, loadParcelScene, releaseHandoff, subscribeHandoff } from "@/components/scene3d/load-scene"
import { requestAnalysis } from "@/lib/api-client"
import { baseSceneMode } from "@/lib/scene"
import type { ParcelScene } from "@/lib/scene3d"
import type { Analysis, CropId, SourceKey } from "@/lib/types"
import { cn } from "@/lib/utils"
import { fieldSearchText } from "@/lib/validation"
import { LiteToggle, LoadingFrame } from "./loading-frame"
import { LoadErrorState, startHref, toLoadError, type LoadError } from "./loading-states"
import { SourceIcon } from "./source-icon"
import { STORY_SOURCES } from "./story-config"
import { journeySound } from "./journey-sound"

const JourneyCanvas = dynamic(() => import("@/components/scene3d/journey-scene").then((m) => m.JourneyCanvas), { ssr: false })

const OVERALL_TIMEOUT = 25000
const SKY = "bg-[linear-gradient(180deg,#FBE8C6_0%,#F6DDB2_45%,#F1D6A8_100%)]"
const POLAND_CENTER = { lat: 52.1, lon: 19.4 }
const POP = "animate-in fade-in slide-in-from-bottom-2 fill-mode-both animation-duration-[450ms] ease-[cubic-bezier(.34,1.56,.64,1)]"
const CHIP = "flex h-10 items-center gap-2 rounded-[14px] bg-paper pr-3 pl-2 text-sm font-bold whitespace-nowrap shadow-[0_10px_24px_-14px_rgba(60,40,20,.5)]"

type Location = { id: string; lat: number; lon: number; obreb: string; gmina: string; wojewodztwo: string; areaHa: number; parcelIds?: string[] }
type Stage = "journey" | "result" | "handoff" | "gone"
type ChipState = "ok" | "idle"

export function analysisIdOf(parcel: string, crop: string, date: string) {
  return [parcel, crop, date].map(encodeURIComponent).join("~")
}

function sceneSection(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('section[aria-label="Scena 3D działki"]')
  for (const el of all) if (el.getBoundingClientRect().width > 0) return el
  return null
}

function chipState(analysis: Analysis | null, key: SourceKey): ChipState {
  const s = analysis?.sourceStatus.find((x) => x.key === key)
  if (!analysis) return key === "teren" || key === "hydrologia" ? "ok" : "idle"
  return !s || (s.ok && !s.pending) ? "ok" : "idle"
}

function Dots() {
  return (
    <span aria-hidden="true" className="inline-flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }} />
      ))}
    </span>
  )
}

function Check({ delay = 0 }: { delay?: number }) {
  return (
    <span
      aria-label="gotowe"
      className="flex size-5 flex-none animate-in items-center justify-center rounded-full bg-primary text-white zoom-in-0 fill-mode-both animation-duration-200 ease-[cubic-bezier(.34,1.56,.64,1)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function SourceChip({ source, label, state, index, side }: { source: SourceKey; label: string; state: ChipState; index: number; side: "left" | "right" }) {
  return (
    <li
      className={cn(
        "list-none animate-in fade-in fill-mode-both animation-duration-[450ms] ease-[cubic-bezier(.34,1.4,.64,1)]",
        side === "right" ? "slide-in-from-right-10 spin-in-4" : "slide-in-from-left-10 -spin-in-4",
      )}
      style={{ animationDelay: `${index * 250}ms` }}
    >
      <span className={CHIP}>
        <SourceIcon source={source} />
        {label}
        {state === "ok" && <Check delay={index * 250 + 300} />}
      </span>
    </li>
  )
}

function useSoundOn() {
  return useSyncExternalStore(
    journeySound.subscribe,
    () => !journeySound.isMuted(),
    () => true,
  )
}

export function Journey({
  parcel,
  crop,
  date,
  onRetry,
  onFallback,
}: {
  parcel: string
  crop: CropId
  date: string
  onRetry: () => void
  onFallback: () => void
}) {
  const id = analysisIdOf(parcel, crop, date)
  const [loc, setLoc] = useState<Location | null>(null)
  const [locMissing, setLocMissing] = useState(false)
  const [scene, setScene] = useState<ParcelScene | null>(null)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<LoadError | null>(null)
  const [phase, setPhase] = useState<JourneyPhase>("search")
  const [orthoReady, setOrthoReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [stage, setStage] = useState<Stage>("journey")
  const [box, setBox] = useState<PanelRect | null>(null)
  const settledRef = useRef(false)
  const handoff = useSyncExternalStore(subscribeHandoff, () => getHandoff(id), () => null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/parcels/${encodeURIComponent(parcel)}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (res.status === 404) setError({ kind: "not_found", parcelId: ((await res.json().catch(() => null)) as { parcelId?: string } | null)?.parcelId ?? parcel })
        else if (res.status === 422) setError({ kind: "invalid_selection", message: ((await res.json()) as { message: string }).message })
        else if (res.ok) setLoc((await res.json()) as Location)
        else setLocMissing(true)
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setLocMissing(true)
      })
    loadParcelScene(id, 15000).then((s) => {
      if (ctrl.signal.aborted) return
      if (s) setScene(s)
      else setSceneFailed(true)
    })
    requestAnalysis({ parcelId: parcel, crop, date }, ctrl.signal).then((result) => {
      if (ctrl.signal.aborted) return
      if (result.ok) setAnalysis(result.analysis)
      else setError(toLoadError(result, parcel))
    })
    const watchdog = window.setTimeout(() => {
      if (settledRef.current) return
      ctrl.abort()
      setError({ kind: "unavailable", reason: "timeout" })
    }, OVERALL_TIMEOUT)
    return () => {
      window.clearTimeout(watchdog)
      ctrl.abort()
    }
  }, [id, parcel, crop, date])

  const soundOn = useSoundOn()
  const ticked = useRef(new Set<SourceKey>())

  useEffect(() => {
    if (phase === "fly") {
      journeySound.play("whoosh")
      const timer = window.setTimeout(() => journeySound.play("pop"), 380)
      return () => window.clearTimeout(timer)
    }
    if (phase === "trace") journeySound.play("shimmer")
    if (phase === "panel") journeySound.play("chime")
  }, [phase])

  useEffect(() => {
    journeySound.setAmbient(soundOn && (phase === "hover" || phase === "wait"))
  }, [phase, soundOn])

  useEffect(() => () => journeySound.setAmbient(false), [])

  useEffect(() => {
    if (phase !== "sources" && phase !== "wait") return
    const timers: number[] = []
    STORY_SOURCES.forEach((s, i) => {
      if (ticked.current.has(s.key) || chipState(analysis, s.key) !== "ok") return
      ticked.current.add(s.key)
      const wait = phase === "sources" ? i * 250 + 300 : 120 * ticked.current.size
      timers.push(window.setTimeout(() => journeySound.play("tick", i), wait))
    })
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phase, analysis])

  useEffect(() => {
    if (!sceneFailed || !analysis || stage !== "journey" || !phaseAtLeast(phase, "hover")) return
    settledRef.current = true
    const timer = window.setTimeout(() => {
      setStage("handoff")
      window.history.replaceState(null, "", `/dzialka/${analysis.id}`)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [sceneFailed, analysis, stage, phase])

  useEffect(() => {
    if (phase !== "panel" || !scene || !analysis) return
    settledRef.current = true
    beginHandoff(analysis.id, scene)
    const timer = window.setTimeout(() => setStage("result"), 0)
    return () => window.clearTimeout(timer)
  }, [phase, scene, analysis])

  useEffect(() => {
    if (stage !== "result") return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const el = sceneSection()
        if (!el) return
        const r = el.getBoundingClientRect()
        const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
        setBox({ top: r.top, left: r.left, width: r.width, height: r.height, radius })
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [stage])

  useEffect(() => {
    if (phase !== "done" || !analysis) return
    releaseHandoff(analysis.id)
    window.history.replaceState(null, "", `/dzialka/${analysis.id}`)
    const timer = window.setTimeout(() => setStage((s) => (s === "result" ? "handoff" : s)), 3500)
    return () => window.clearTimeout(timer)
  }, [phase, analysis])

  useEffect(() => {
    if (!handoff?.ready) return
    const timer = window.setTimeout(() => setStage((s) => (s === "result" ? "handoff" : s)), 120)
    return () => window.clearTimeout(timer)
  }, [handoff?.ready])

  useEffect(() => {
    if (stage !== "handoff") return
    const timer = window.setTimeout(() => setStage("gone"), 650)
    return () => window.clearTimeout(timer)
  }, [stage])

  if (error) {
    return (
      <LoadingFrame>
        <LoadErrorState error={error} input={{ parcel, crop, date }} onRetry={onRetry} />
      </LoadingFrame>
    )
  }

  const pin = loc ? { lat: loc.lat, lon: loc.lon } : locMissing ? POLAND_CENTER : null
  const mode = analysis ? baseSceneMode(analysis.status) : "hero"
  const proceed = !!analysis
  const leaving = stage !== "journey"
  const flying = !phaseAtLeast(phase, "trace")
  const tracing = phase === "trace"
  const sourcing = phase === "sources" || phase === "wait"
  const place = loc ? `${loc.obreb}, gm. ${loc.gmina}` : null
  const area = loc?.areaHa ? ` · ${loc.areaHa.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} ha` : ""
  const multi = parcel.includes("+")
  const searchText = fieldSearchText(parcel)
  const liveStatus = flying ? (place ?? searchText) : tracing ? `${multi ? "Pole znalezione" : "Działka znaleziona"}${area}` : proceed ? "Gotowe, otwieramy wynik." : "Zbieramy dane: pogoda, satelita, gleba, teren i woda."
  const searching = phase === "search" || phase === "fly"
  const label = (key: SourceKey, fallback: string) => analysis?.sourceStatus.find((x) => x.key === key)?.label ?? fallback
  const left = STORY_SOURCES.filter((s) => s.side === "left")
  const right = STORY_SOURCES.filter((s) => s.side === "right")

  return (
    <>
      {leaving && analysis && <ResultView analysis={analysis} entrance />}
      {stage !== "gone" && (
        <div aria-busy={!leaving} className={cn("fixed inset-0 z-50", leaving && "pointer-events-none")}>
          <div className={cn("absolute inset-0 transition-opacity duration-700", SKY, leaving && "opacity-0")} />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-[260px] -right-[220px] size-[1000px] rounded-full bg-[radial-gradient(circle,rgba(255,201,120,.55)_0%,rgba(255,201,120,0)_62%)] transition-opacity duration-700",
              leaving && "opacity-0",
            )}
          />
          <div className={cn("fixed inset-0 transition-opacity", stage === "handoff" ? "opacity-0 duration-500" : "duration-300", !ready && "opacity-0")}>
            <SceneErrorBoundary onError={onFallback}>
              <JourneyCanvas
                panelRect={box}
                pin={pin}
                scene={scene}
                analysis={analysis}
                proceed={proceed}
                crop={crop}
                mode={mode}
                onPhase={setPhase}
                onOrtho={setOrthoReady}
                onReady={() => setReady(true)}
                className="h-full w-full"
              />
            </SceneErrorBoundary>
          </div>
          <div className={cn("pointer-events-none absolute inset-0 transition-opacity", leaving || phaseAtLeast(phase, "panel") ? "opacity-0 duration-200" : "duration-500")}>
            <p role="status" aria-live="polite" className="sr-only">
              {liveStatus}
            </p>
            <header className="pointer-events-auto flex items-center justify-between gap-4 px-4 pt-4 md:px-10 md:pt-6">
              <Link href={startHref({ parcel, crop, date })} className="flex items-center gap-2.5 rounded-xl text-foreground no-underline">
                <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                  <path d="M17 3 C 12 10, 6 16, 6 22 A 11 11 0 0 0 28 22 C 28 16, 22 10, 17 3 Z" fill="#0E6E73" />
                  <path d="M11.5 22 A 5.5 5.5 0 0 0 17 27.5" stroke="#9FDCE6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </svg>
                <span className="font-heading text-[26px] font-extrabold tracking-[0.02em] md:text-[30px]">ROSA</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={soundOn}
                  aria-label={soundOn ? "Wycisz dźwięki" : "Włącz dźwięki"}
                  onClick={() => journeySound.setMuted(soundOn)}
                  className="rosa-btn flex size-11 cursor-pointer items-center justify-center rounded-2xl border-2 border-border bg-paper text-foreground md:size-12"
                >
                  {soundOn ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
                </button>
                <LiteToggle />
              </div>
            </header>

            {flying && (
              <>
                <div
                  aria-hidden="true"
                  className={cn(
                    POP,
                    "absolute bottom-5 left-4 flex items-center gap-2.5 rounded-2xl bg-paper px-3.5 py-2.5 text-[15px] font-bold shadow-[0_10px_24px_-14px_rgba(60,40,20,.5)] transition-opacity duration-500 md:bottom-8 md:left-10",
                    !searching && "opacity-0",
                  )}
                >
                  <Dots />
                  {searchText}
                </div>
                {place && (
                  <span aria-hidden="true" className={cn(POP, "absolute right-4 bottom-[76px] rounded-xl bg-foreground px-3 py-1.5 text-sm font-bold text-paper md:right-10 md:bottom-9")}>
                    {place}
                  </span>
                )}
              </>
            )}

            {tracing && (
              <>
                <div aria-hidden="true" className={cn(POP, "absolute top-[84px] left-4 flex items-center gap-2.5 rounded-2xl bg-paper px-3.5 py-2.5 text-[15px] font-bold shadow-[0_10px_24px_-14px_rgba(60,40,20,.5)] md:top-[104px] md:left-10")}>
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-white">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {multi ? "Pole znalezione" : "Działka znaleziona"}{area}
                </div>
                {orthoReady && (
                  <span aria-hidden="true" className={cn(POP, "absolute right-4 bottom-5 rounded-xl bg-paper/90 px-3 py-1.5 text-[13px] text-[#3A2F24] md:right-10 md:bottom-8")}>
                    Ortofoto GUGiK · granica z ULDK
                  </span>
                )}
              </>
            )}

            {sourcing && (
              <>
                <ul aria-label="Źródła danych" className="absolute top-[84px] left-4 m-0 flex flex-col items-start gap-2 p-0 md:top-[104px] md:left-10">
                  {left.map((s, i) => (
                    <SourceChip key={s.key} source={s.key} label={label(s.key, s.label)} state={chipState(analysis, s.key)} index={i} side="left" />
                  ))}
                </ul>
                <ul aria-label="Źródła danych, ciąg dalszy" className="absolute top-[84px] right-4 m-0 flex flex-col items-end gap-2 p-0 md:top-[104px] md:right-10">
                  {right.map((s, i) => (
                    <SourceChip key={s.key} source={s.key} label={label(s.key, s.label)} state={chipState(analysis, s.key)} index={left.length + i} side="right" />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
