"use client"

import { useEffect, useState } from "react"
import type { Analysis } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LiteBanner } from "./lite-banner"
import { MobileResult } from "./mobile-result"
import { ResultHeader } from "./result-header"
import { DesktopScene } from "./scene-panel"
import {
  ActionsSection,
  CausesSection,
  ConfidenceSection,
  Divider,
  HistorySection,
  JumpToActions,
  SourcesFooter,
  StatusSection,
} from "./sections"

const ACTIONS_ID = "co-zrobic"

export function ResultView({ analysis: initial, entrance = false }: { analysis: Analysis; entrance?: boolean }) {
  const [analysis, setAnalysis] = useState(initial)
  const satellitePending = analysis.sourceStatus.some((s) => s.pending)
  useEffect(() => {
    if (!satellitePending) return
    const controller = new AbortController()
    fetch(`/api/analyses/${analysis.id}/satellite`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Analysis>) : null))
      .then((next) => {
        if (next) setAnalysis(next)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [satellitePending, analysis.id])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = analysis.recommendations.find((r) => r.id === selectedId) ?? null
  const toggle = (id: string) => setSelectedId((cur) => (cur === id ? null : id))
  const clear = () => setSelectedId(null)

  return (
    <>
      <div className="hidden h-dvh min-h-[640px] flex-col bg-[#F1E5D2] lg:flex">
        <ResultHeader analysis={analysis} />
        <main className="flex min-h-0 flex-1 gap-5 p-5">
          <DesktopScene analysis={analysis} selected={selected} onClear={clear} />
          <aside
            aria-label="Wynik analizy"
            className={cn(
              "rosa-clay flex w-[460px] flex-none flex-col gap-[22px] overflow-y-auto overscroll-contain rounded-[28px] bg-paper p-7 xl:w-[540px]",
              entrance && "animate-in duration-800 ease-[cubic-bezier(.34,1.56,.64,1)] fade-in slide-in-from-right-24",
            )}
          >
            <LiteBanner />
            <StatusSection analysis={analysis} />
            <Divider />
            <HistorySection analysis={analysis} />
            <Divider />
            <CausesSection analysis={analysis} />
            <JumpToActions analysis={analysis} targetId={ACTIONS_ID} />
            <Divider />
            <div id={ACTIONS_ID} tabIndex={-1} className="scroll-mt-2 outline-none">
              <ActionsSection analysis={analysis} selectedId={selectedId} onToggle={toggle} headingId="s4" />
            </div>
            <Divider />
            <ConfidenceSection analysis={analysis} />
            <SourcesFooter analysis={analysis} />
          </aside>
        </main>
      </div>
      <MobileResult analysis={analysis} selected={selected} onSelect={setSelectedId} onClear={clear} entrance={entrance} className="lg:hidden" />
    </>
  )
}
