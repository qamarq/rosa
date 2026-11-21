"use client"

import { useSyncExternalStore } from "react"
import { getLoadedScene, subscribeHandoff } from "@/components/scene3d/load-scene"
import { exaggerationOf } from "@/components/scene3d/world"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FAILURE_COPY } from "@/components/loading/story-config"
import type { Analysis, SourceKey } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDatePl } from "@/lib/validation"

const PENDING_NAME: Record<SourceKey, string> = {
  pogoda: "dane pogodowe",
  satelita: "zdjęcie satelitarne",
  gleba: "mapę gleb",
  teren: "model terenu",
  hydrologia: "dane o wodach",
  rzeki: "stan rzek",
  gruntowe: "wody gruntowe",
}

type State = "ok" | "pending" | "fail"

function Ring() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="flex-none animate-spin [animation-duration:1.4s]">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Tick({ pop }: { pop?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[18px] flex-none items-center justify-center rounded-full bg-primary text-white",
        pop && "animate-in zoom-in-0 fill-mode-both animation-duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
      )}
    >
      <svg width="10" height="10" viewBox="0 0 12 12">
        <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function StateIcon({ state }: { state: State }) {
  if (state === "ok") return <Tick />
  if (state === "pending")
    return (
      <span className="flex size-[18px] flex-none items-center justify-center text-water-deep">
        <Ring />
      </span>
    )
  return (
    <span aria-hidden="true" className="flex size-[18px] flex-none items-center justify-center rounded-full bg-[#E6E1D8] text-[11px] font-extrabold text-[#4A453E]">
      ✕
    </span>
  )
}

export function DataStatusPill({ analysis, compact = false, className }: { analysis: Analysis; compact?: boolean; className?: string }) {
  const rows = analysis.sourceStatus.map((s) => ({
    ...s,
    state: (s.pending ? "pending" : s.ok ? "ok" : "fail") as State,
    source: analysis.sources.find((d) => d.key === s.key),
  }))
  const total = rows.length
  const ok = rows.filter((r) => r.state === "ok").length
  const pending = rows.filter((r) => r.state === "pending")
  const failed = rows.filter((r) => r.state === "fail")
  const complete = ok === total
  const text = complete
    ? "Dane: komplet"
    : pending.length
      ? `Dane: ${ok}/${total} · dociągam ${pending.map((p) => PENDING_NAME[p.key]).join(", ")}`
      : `Dane: ${ok}/${total} · brak: ${failed.map((f) => f.label).join(", ")}`
  const short = complete ? "Dane: komplet" : `Dane: ${ok}/${total}`
  const scene = useSyncExternalStore(subscribeHandoff, () => getLoadedScene(analysis.id), () => null)
  const relief = scene ? exaggerationOf(scene).toLocaleString("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : null

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${text}. Pokaż szczegóły źródeł`}
        className={cn(
          "pointer-events-auto flex cursor-pointer items-center gap-2 rounded-2xl bg-paper/90 font-bold text-foreground shadow-[0_8px_20px_-14px_rgba(60,40,20,.5)]",
          compact ? "h-9 px-2.5 text-[13px]" : "h-11 px-3.5 text-sm",
          className,
        )}
      >
        {complete ? <Tick key="ok" pop /> : pending.length ? <span className="text-water-deep"><Ring /></span> : <StateIcon state="fail" />}
        <span className="truncate">{compact ? short : text}</span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] gap-1 rounded-[20px] bg-paper p-3 ring-border">
        <span className="px-1.5 pb-1 text-[13px] font-extrabold tracking-[.06em] text-muted-foreground uppercase">Źródła danych · {ok}/{total}</span>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((r) => (
            <li key={r.key} className="flex gap-2.5 rounded-xl px-1.5 py-2">
              <span className="pt-0.5">
                <StateIcon state={r.state} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
                  {r.label}
                  <span className={cn("text-xs font-bold", r.state === "ok" ? "text-water-deep" : r.state === "pending" ? "text-[#8A6A1A]" : "text-[#7A2E18]")}>
                    {r.state === "ok" ? (r.source ? "pobrane" : "sprawdzone") : r.state === "pending" ? "w tle" : "brak"}
                  </span>
                </span>
                <span className="text-[13px] leading-[1.4] text-muted-foreground">
                  {r.state === "ok"
                    ? r.source
                      ? `${r.source.name}${r.source.fetchedAt ? ` · pobrano ${formatDatePl(r.source.fetchedAt)}` : ""}${r.key === "satelita" && analysis.vegetation ? ` · zdjęcie z ${formatDatePl(analysis.vegetation.imageDate)}` : ""}`
                      : (r.message ?? "")
                    : r.state === "pending"
                      ? "Wczytuje się w tle. Wynik uzupełni się sam, gdy dane dotrą."
                      : (r.message ?? FAILURE_COPY[r.key].body)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {relief && (
          <p className="m-0 mt-1 border-t border-border px-1.5 pt-2 text-xs leading-[1.4] text-muted-foreground">
            Teren: NMT GUGiK, rzeźba przewyższona ×{relief}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
