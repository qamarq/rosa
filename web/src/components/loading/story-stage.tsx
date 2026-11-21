"use client"

import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { Diorama } from "@/components/diorama/diorama"
import type { Analysis, SourceKey } from "@/lib/types"
import { fieldSearchText } from "@/lib/validation"
import { SourceIcon } from "./source-icon"
import { FAILURE_COPY, STORY_SOURCES, TIMING, delayFromSceneStart, type StoryStep } from "./story-config"
import styles from "./loading.module.css"

type Vars = CSSProperties & Record<`--${string}`, string>

const POLAND =
  "7,55 51,44 102,16 153,11 160,33 190,30 299,33 323,60 337,126 313,154 343,231 292,324 238,308 187,308 163,302 119,258 78,236 34,220 24,160 3,121 14,93"
const PARCEL = "236,96 446,78 478,196 384,252 256,226"

const chipBase = "flex h-10 items-center gap-2 rounded-[14px] bg-paper pr-3 pl-2 text-sm font-bold whitespace-nowrap"

export type StoryStageProps = {
  step: StoryStep
  animated: boolean
  parcelId: string
  analysis: Analysis | null
  dataAt: number | null
  idle?: boolean
}

export function StoryStage({ step, animated, parcelId, analysis, dataAt, idle }: StoryStageProps) {
  const visible = (scene: StoryStep) =>
    !idle && (animated ? step >= scene && step <= scene + 1 : scene === 2)

  return (
    <div
      className={cn(
        styles.stage,
        "rosa-clay relative h-[540px] w-full overflow-hidden rounded-[28px] bg-[#F3DDB6] md:h-[min(600px,calc(100dvh-260px))] md:min-h-[440px] md:rounded-[32px]",
      )}
    >
      {visible(0) && <MapScene parcelId={parcelId} analysis={analysis} />}
      {visible(1) && <OrthoScene analysis={analysis} animated={animated} />}
      {visible(2) && (
        <SourcesScene analysis={analysis} dataAt={animated ? dataAt : null} animated={animated} settled={step === 3} />
      )}
    </div>
  )
}

function Dots({ label, small }: { label?: string; small?: boolean }) {
  return (
    <>
      <span className={cn(styles.dots, small && "gap-[3px]")} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label && <span className="sr-only">{label}</span>}
    </>
  )
}

function CheckBadge({ delay = 0, className }: { delay?: number; className?: string }) {
  return (
    <span
      className={cn(
        styles.check,
        "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white",
        className,
      )}
      style={{ "--d": `${delay}ms` } as Vars}
    >
      <span aria-hidden="true">✓</span>
      <span className="sr-only">gotowe</span>
    </span>
  )
}

function MapScene({ parcelId, analysis }: { parcelId: string; analysis: Analysis | null }) {
  return (
    <div className="absolute inset-0 bg-[#F3DDB6]">
      <div aria-hidden="true" className="absolute top-[6.7%] left-1/2 w-[min(86cqw,100cqh)] -translate-x-1/2">
        <div className={styles.camera}>
          <svg viewBox="-10 -10 360 345" className="block h-auto w-full">
            <polygon points={POLAND} fill="#E7CF9F" stroke="#B9834F" strokeWidth="4" strokeLinejoin="round" />
            <path
              d="M112 262 C 80 230, 50 190, 30 150 S 14 90, 12 62 M182 300 C 210 250, 250 200, 230 150 S 180 80, 160 34 M190 230 C 150 200, 120 170, 100 160 S 50 140, 32 150"
              stroke="#5FB3C0"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <circle className={styles.ping} cx="104" cy="162" r="10" fill="none" stroke="#0E6E73" strokeWidth="3" />
            <circle cx="104" cy="162" r="7" fill="#0E6E73" stroke="#FFFFFF" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span
          className={cn(styles.cloud, "absolute top-[18%] right-[8%] h-16 w-48 rounded-full bg-white/80 blur-md")}
        />
        <span
          className={cn(styles.cloud, "absolute top-[58%] right-[22%] h-20 w-64 rounded-full bg-white/70 blur-lg")}
          style={{ "--d": "180ms" } as Vars}
        />
      </div>
      <svg
        viewBox="0 0 668 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 size-full max-md:hidden"
      >
        <path
          className={styles.fly}
          d="M40 30 C 180 0, 260 60, 312 150"
          stroke="#2A2118"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <g transform="translate(40 30)">
          <circle r="10" fill="#2A2118" />
          <path d="M-4 0 h8 M0 -4 v8" stroke="#FFFDF8" strokeWidth="2" />
        </g>
      </svg>
      <div className="absolute right-4 bottom-4 left-4 flex items-center gap-2.5 rounded-2xl bg-paper px-3.5 py-2.5 text-[15px] font-bold md:right-auto md:bottom-[18px] md:left-5">
        <Dots />
        <span className="min-w-0 break-all tabular-nums">{fieldSearchText(parcelId)}</span>
      </div>
      {analysis && (
        <span
          className={cn(
            styles.pop,
            "absolute top-4 right-4 rounded-xl bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground md:top-auto md:right-5 md:bottom-[22px]",
          )}
        >
          {analysis.parcel.obreb}, gm. {analysis.parcel.gmina}
        </span>
      )}
    </div>
  )
}

function OrthoScene({ analysis, animated }: { analysis: Analysis | null; animated: boolean }) {
  const area = analysis?.parcel.areaHa.toLocaleString("pl-PL", { maximumFractionDigits: 1 })
  return (
    <div className={cn(animated && styles.sceneIn, "absolute inset-0 bg-[#8E9A5A]")}>
      <svg
        viewBox="0 0 668 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 size-full"
      >
        <g transform="rotate(-8 334 150)">
          <rect x="-40" y="-140" width="230" height="270" fill="#A9AF66" />
          <rect x="190" y="-140" width="160" height="210" fill="#C9B46E" />
          <rect x="350" y="-140" width="190" height="230" fill="#9CA85C" />
          <rect x="540" y="-140" width="200" height="240" fill="#B8A86A" />
          <rect x="-40" y="130" width="200" height="320" fill="#B9A35F" />
          <rect x="560" y="100" width="180" height="360" fill="#A0A965" />
          <rect x="160" y="300" width="400" height="160" fill="#9FA75E" />
          <path d="M190 -140 V 300 M350 -140 V 90 M540 -140 V 460 M-40 130 H 190 M160 130 V 460" stroke="#E6D3A3" strokeWidth="5" />
        </g>
        <path
          d="M520 -80 C 528 80, 512 140, 526 200 S 532 260, 520 400"
          stroke="#4E9BA3"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <polygon points={PARCEL} fill="#5F6B2E" opacity=".25" transform="translate(4 6)" />
        <g className={styles.lift}>
          <polygon points={PARCEL} fill="#C9A65A" opacity=".85" />
          <g className={styles.glow}>
            <polygon
              points={PARCEL}
              fill="none"
              stroke="#FFF3C4"
              strokeWidth="10"
              strokeLinejoin="round"
              opacity=".75"
              style={{ filter: "blur(6px)" }}
            />
          </g>
          <polygon
            className={styles.trace}
            pathLength={1}
            points={PARCEL}
            fill="none"
            stroke="#FFF7D6"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <div className="absolute top-4 left-4 flex items-center gap-2.5 rounded-2xl bg-paper px-3.5 py-2.5 text-[15px] font-bold md:top-[18px] md:left-5">
        {analysis ? (
          <>
            <span
              aria-hidden="true"
              className={cn(
                styles.check,
                "flex size-[22px] items-center justify-center rounded-full bg-primary text-[13px] text-white",
              )}
              style={{ "--d": "600ms" } as Vars}
            >
              ✓
            </span>
            Działka znaleziona · {area} ha
          </>
        ) : (
          <>
            <Dots />
            Wyznaczamy granicę działki…
          </>
        )}
      </div>
      <span className="absolute right-4 bottom-4 rounded-xl bg-paper/90 px-3 py-1.5 text-[13px] text-[#3A2F24] md:right-5 md:bottom-[18px]">
        Ortofoto GUGiK · granica z ULDK
      </span>
    </div>
  )
}

type SourceState = "pending" | "ok" | "fail"

function sourceState(analysis: Analysis | null, key: SourceKey): SourceState {
  if (!analysis) return "pending"
  return analysis.sourceStatus.find((s) => s.key === key)?.ok === false ? "fail" : "ok"
}

function SourcesScene({
  analysis,
  dataAt,
  animated,
  settled,
}: {
  analysis: Analysis | null
  dataAt: number | null
  animated: boolean
  settled: boolean
}) {
  const failures = analysis?.sourceStatus.filter((s) => !s.ok) ?? []
  const lastChip = TIMING.chipLead + (STORY_SOURCES.length - 1) * TIMING.chipStagger
  const messageDelay = delayFromSceneStart(lastChip + 600, dataAt, TIMING.sources)

  const chip = (index: number) => {
    const source = STORY_SOURCES[index]
    const state = sourceState(analysis, source.key)
    const flyIn = TIMING.chipLead + index * TIMING.chipStagger
    const reveal = delayFromSceneStart(flyIn + TIMING.checkAfter, dataAt, TIMING.sources)
    const label = analysis?.sourceStatus.find((s) => s.key === source.key)?.label ?? source.label
    const right = source.side === "right"
    return (
      <li
        key={source.key}
        className={cn(styles.chip, "list-none")}
        style={{ "--d": `${flyIn}ms`, "--from": right ? "40px" : "-40px", "--rot": right ? "4deg" : "-4deg" } as Vars}
      >
        <span
          className={cn(chipBase, state === "fail" && styles.failed)}
          style={state === "fail" ? ({ "--d": `${reveal}ms` } as Vars) : undefined}
        >
          <SourceIcon source={source.key} />
          {state === "fail" ? `${label} — brak odpowiedzi` : label}
          {state === "ok" && <CheckBadge delay={reveal} />}
          {state === "pending" && <Dots small label="pobieranie" />}
        </span>
      </li>
    )
  }

  return (
    <div className={cn(animated && styles.sceneIn, "absolute inset-0 bg-[#F3D9AE]")}>
      <div className="absolute bottom-[10%] left-1/2 w-[min(100cqw,150cqh)] -translate-x-1/2 md:top-[1.3%] md:bottom-auto md:w-[min(60cqw,133cqh)]">
        <div className={cn(settled && styles.settle)}>
          <Diorama mode="susza" labels={false} className="w-full" />
        </div>
      </div>
      {animated && (
        <div aria-hidden="true" className={cn(styles.orbit, "absolute top-4 left-[45%] max-md:hidden")}>
          <svg width="56" height="36" viewBox="0 0 56 36">
            <rect x="20" y="8" width="16" height="20" rx="5" fill="#5B4D3E" />
            <rect x="0" y="12" width="18" height="12" rx="3" fill="#3FA3B0" />
            <rect x="38" y="12" width="18" height="12" rx="3" fill="#3FA3B0" />
            <circle cx="28" cy="32" r="3" fill="#E3A73C" />
          </svg>
        </div>
      )}
      <div className="absolute inset-x-3 top-3 md:static">
        <ul
          aria-label="Źródła danych"
          className="m-0 flex flex-wrap gap-2 p-0 md:absolute md:top-[18px] md:left-4 md:flex-col md:flex-nowrap md:items-start"
        >
          {[0, 1, 2].map(chip)}
        </ul>
        <ul
          aria-label="Źródła danych, ciąg dalszy"
          className="m-0 mt-2 flex flex-wrap gap-2 p-0 md:absolute md:top-[18px] md:right-4 md:mt-0 md:flex-col md:flex-nowrap md:items-end"
        >
          {[3, 4].map(chip)}
        </ul>
      </div>
      {failures.length > 0 ? (
        <div
          role="status"
          className={cn(styles.fadeUp, "absolute inset-x-3 bottom-3 flex flex-col gap-2 md:inset-x-4 md:bottom-3.5")}
          style={{ "--d": `${messageDelay}ms` } as Vars}
        >
          {failures.map((f) => (
            <div key={f.key} className="flex items-center gap-3 rounded-2xl bg-paper px-3.5 py-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-muted font-extrabold"
              >
                !
              </span>
              <span className="text-sm leading-[1.4]">
                <strong>{FAILURE_COPY[f.key].title}</strong> {f.message ?? FAILURE_COPY[f.key].body}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            animated && styles.slide,
            "absolute bottom-2.5 left-1/2 flex h-10 w-40 -translate-x-1/2 flex-col overflow-hidden rounded-[10px]",
          )}
        >
          <span className="h-2.5 bg-[#7DAF46]" />
          <span className="h-3.5 bg-[#9C6E45]" />
          <span className="flex-1 bg-[#D8B37E]" />
        </div>
      )}
    </div>
  )
}
