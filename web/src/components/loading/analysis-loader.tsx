"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useLiteMode } from "@/components/lite-mode"
import { Button } from "@/components/ui/button"
import { requestAnalysis, type ClientResult } from "@/lib/api-client"
import { cropLabel, isCropId } from "@/lib/crops"
import type { Analysis, CropId } from "@/lib/types"
import { formatDatePl, isDateInRange, isValidParcelId } from "@/lib/validation"
import { LoadingFrame } from "./loading-frame"
import { LoadErrorState, startHref, type LoadError, type LoadInput } from "./loading-states"
import { TIMING, type StoryStep } from "./story-config"
import { StoryStage } from "./story-stage"

type RunState =
  | { status: "loading" }
  | { status: "ready"; analysis: Analysis; at: number }
  | { status: "error"; error: LoadError }

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  )
}

function toLoadError(result: Extract<ClientResult, { ok: false }>, parcelId: string): LoadError {
  const { error } = result
  switch (error.code) {
    case "parcel_not_found":
      return { kind: "not_found", parcelId: error.parcelId ?? parcelId }
    case "invalid_parcel_id":
      return { kind: "invalid_parcel" }
    case "date_out_of_range":
      return { kind: "date_out_of_range", min: error.min }
    case "network":
      return { kind: "unavailable", reason: "network" }
    default:
      return { kind: "unavailable", reason: "upstream" }
  }
}

export function AnalysisLoader() {
  const params = useSearchParams()
  const { bfcacheId } = useRouter()
  const input: LoadInput = {
    parcel: params.get("parcel")?.trim() ?? "",
    crop: params.get("crop") ?? "",
    date: params.get("date") ?? "",
  }
  return <AnalysisFlow key={`${bfcacheId}|${input.parcel}|${input.crop}|${input.date}`} {...input} />
}

function AnalysisFlow({ parcel, crop, date }: LoadInput) {
  const router = useRouter()
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  const incomplete = !parcel || !date || !isCropId(crop)

  useEffect(() => {
    if (incomplete) router.replace(startHref({ parcel, crop: isCropId(crop) ? crop : "", date }))
  }, [incomplete, parcel, crop, date, router])

  if (incomplete) return <LoadingFallback />

  const input = { parcel, crop, date }
  const invalid: LoadError | null = !isValidParcelId(parcel)
    ? { kind: "invalid_parcel" }
    : !isDateInRange(date)
      ? { kind: "date_out_of_range" }
      : null

  if (invalid) {
    return (
      <LoadingFrame>
        <LoadErrorState error={invalid} input={input} onRetry={retry} />
      </LoadingFrame>
    )
  }

  return <RunAttempt key={attempt} parcel={parcel} crop={crop as CropId} date={date} onRetry={retry} />
}

function RunAttempt({ parcel, crop, date, onRetry }: LoadInput & { crop: CropId; onRetry: () => void }) {
  const router = useRouter()
  const { lite } = useLiteMode()
  const reduced = usePrefersReducedMotion()
  const skip = lite || reduced

  const [run, setRun] = useState<RunState>({ status: "loading" })
  const [step, setStep] = useState<StoryStep>(0)
  const [slow, setSlow] = useState(false)
  const [target, setTarget] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const startRef = useRef<number | null>(null)
  const settledRef = useRef(false)

  const elapsed = useCallback(() => {
    startRef.current ??= performance.now()
    return performance.now() - startRef.current
  }, [])

  useEffect(() => {
    if (settledRef.current) return
    const ctrl = new AbortController()
    const settle = (next: RunState) => {
      if (settledRef.current) return
      settledRef.current = true
      setRun(next)
    }
    elapsed()
    const watchdog = window.setTimeout(() => {
      ctrl.abort()
      settle({ status: "error", error: { kind: "unavailable", reason: "timeout" } })
    }, TIMING.requestTimeout)
    requestAnalysis({ parcelId: parcel, crop, date }, ctrl.signal).then((result) => {
      window.clearTimeout(watchdog)
      if (ctrl.signal.aborted) return
      settle(
        result.ok
          ? { status: "ready", analysis: result.analysis, at: elapsed() }
          : { status: "error", error: toLoadError(result, parcel) },
      )
    })
    return () => {
      window.clearTimeout(watchdog)
      ctrl.abort()
    }
  }, [parcel, crop, date, elapsed])

  useEffect(() => {
    const now = elapsed()
    const ids = [window.setTimeout(() => setSlow(true), Math.max(0, TIMING.slow - now))]
    if (!skip) {
      const marks: [StoryStep, number][] = [
        [1, TIMING.trace],
        [2, TIMING.sources],
        [3, TIMING.settle],
      ]
      for (const [s, at] of marks) {
        ids.push(window.setTimeout(() => setStep((p) => (p < s ? s : p)), Math.max(0, at - now)))
      }
    }
    return () => ids.forEach((id) => window.clearTimeout(id))
  }, [skip, elapsed])

  const analysis = run.status === "ready" ? run.analysis : null
  const hasFailure = analysis?.sourceStatus.some((s) => !s.ok) ?? false

  useEffect(() => {
    if (run.status !== "ready") return
    const href = `/dzialka/${run.analysis.id}`
    router.prefetch(href)
    const now = elapsed()
    const storyEnd = hasFailure ? TIMING.endWithFailure : TIMING.end
    const lateData = run.at > TIMING.sources ? TIMING.afterData - (now - run.at) : 0
    const hold = skip ? 0 : Math.max(0, storyEnd - now, lateData)
    const id = window.setTimeout(() => {
      setTarget(href)
      router.replace(href)
    }, hold)
    return () => window.clearTimeout(id)
  }, [run, skip, hasFailure, router, elapsed])

  useEffect(() => {
    if (!target) return
    const id = window.setTimeout(() => setStuck(true), TIMING.stuck)
    return () => window.clearTimeout(id)
  }, [target])

  const input = { parcel, crop, date }

  if (run.status === "error") {
    return (
      <LoadingFrame>
        <LoadErrorState error={run.error} input={input} onRetry={onRetry} />
      </LoadingFrame>
    )
  }

  const shownStep: StoryStep = step === 3 && !analysis ? 2 : step
  const status = target
    ? "Gotowe, otwieramy wynik…"
    : slow && !analysis
      ? "Jeszcze chwila — źródła odpowiadają wolniej niż zwykle."
      : skip
        ? analysis
          ? "Gotowe, otwieramy wynik…"
          : "Zbieramy dane o Twoim polu…"
        : STATUS_BY_STEP[shownStep]

  return (
    <LoadingFrame>
      <LoadingHeader
        status={status}
        meta={`${cropLabel(crop)} · ${formatDatePl(date)}`}
        backHref={startHref(input)}
      />
      <StoryStage
        step={shownStep}
        animated={!skip}
        parcelId={parcel}
        analysis={analysis}
        dataAt={run.status === "ready" ? run.at : null}
      />
      {stuck && target && (
        <Button nativeButton={false} className="rosa-btn rosa-claybtn h-[52px] rounded-2xl px-6 text-base font-extrabold" render={<Link href={target} replace />}>
          Otwórz wynik
        </Button>
      )}
    </LoadingFrame>
  )
}

const STATUS_BY_STEP: Record<StoryStep, string> = {
  0: "Szukamy działki na mapie…",
  1: "Działka znaleziona, rysujemy jej granicę.",
  2: "Zbieramy dane: pogoda, satelita, gleba, teren i woda.",
  3: "Gotowe, otwieramy wynik…",
}

function LoadingHeader({ status, meta, backHref }: { status: string; meta?: string; backHref?: string }) {
  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 font-heading text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] md:text-[38px]">
          Sprawdzamy Twoje pole
        </h1>
        <p role="status" aria-live="polite" className="m-0 text-[15px] text-muted-foreground md:text-[17px]">
          {status}
        </p>
      </div>
      {(meta || backHref) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-bold text-muted-foreground">
          {meta && <span className="tabular-nums">{meta}</span>}
          {backHref && (
            <Link href={backHref} className="rounded-md text-primary underline-offset-4 hover:underline">
              Zmień dane
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function LoadingFallback() {
  return (
    <LoadingFrame>
      <LoadingHeader status="Szukamy działki na mapie…" />
      <StoryStage step={0} animated parcelId="" analysis={null} dataAt={null} idle />
    </LoadingFrame>
  )
}
