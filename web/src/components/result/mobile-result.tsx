"use client"

import { baseSceneMode, sceneFacts } from "@/lib/scene"
import Link from "next/link"
import { useRef, useState } from "react"
import { useLiteMode } from "@/components/lite-mode"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Analysis, Recommendation } from "@/lib/types"
import { formatDatePl, statusTitle } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { CountUp } from "./count-up"
import { DataStatusPill } from "./data-status"
import { DioramaStage, useCamera } from "./diorama-stage"
import { CAUSE_STYLE, CONFIDENCE, LEVEL_STYLE, SCALE, analysisYear, daysPl, groupedRecommendations, signed, noActionsText, noCausesText } from "./format"
import { ClockIcon, DownloadIcon, FullscreenIcon, LayersIcon, MenuIcon, RosaLogo } from "./icons"
import { DemoBanner } from "./demo-banner"
import { LiteBanner } from "./lite-banner"
import { LiteSwitchVisual } from "./result-header"
import { CountableText } from "./sections"
import { scrollBehavior, useReveal, useStaticMotion } from "./motion"
import styles from "./result.module.css"

const headingCls = "m-0 text-sm font-extrabold tracking-[.08em] text-muted-foreground uppercase"

function MobileHeader({ analysis }: { analysis: Analysis }) {
  const { lite, toggle } = useLiteMode()
  return (
    <header className="no-print flex items-center gap-2.5 border-b border-input bg-[#FBF6EC] px-4 py-3.5">
      <Link href="/" aria-label="ROSA, strona główna" className="flex flex-none">
        <RosaLogo size={26} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold tabular-nums">{analysis.parcel.id}</span>
        <span className="truncate text-[13px] text-ink-soft">
          {analysis.parcel.obreb} · {analysis.cropLabel.toLowerCase()} · {formatDatePl(analysis.request.date)}
        </span>
      </div>
      <Popover>
        <PopoverTrigger
          aria-label="Menu"
          className="flex size-12 flex-none cursor-pointer items-center justify-center rounded-2xl border-2 border-border bg-paper"
        >
          <MenuIcon />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-64 gap-2 rounded-[20px] bg-paper p-2.5 ring-border">
          <Link
            href="/"
            className="flex h-12 items-center rounded-2xl border-2 border-border bg-paper px-4 text-base font-bold text-foreground no-underline hover:text-foreground"
          >
            Zmień działkę
          </Link>
          <button
            type="button"
            aria-pressed={lite}
            onClick={toggle}
            className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border-2 border-border bg-paper px-4 text-base font-bold text-foreground"
          >
            Tryb lekki
            <LiteSwitchVisual on={lite} />
          </button>
          <a
            href={`/api/analyses/${analysis.id}/pdf`}
            download
            className="flex h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-base font-extrabold text-white no-underline hover:text-white"
          >
            <DownloadIcon />
            Pobierz PDF
          </a>
        </PopoverContent>
      </Popover>
    </header>
  )
}

function MobileScene({
  analysis,
  selected,
  onClear,
  sceneRef,
}: {
  analysis: Analysis
  selected: Recommendation | null
  onClear: () => void
  sceneRef: React.RefObject<HTMLElement | null>
}) {
  const cam = useCamera()
  const { status } = analysis
  const weather = status.headline.split(",")[0]
  return (
    <section ref={sceneRef} aria-label="Scena 3D działki" className="relative h-[300px] scroll-mt-0 overflow-hidden bg-[#F3D9AE]">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[90px] bg-[#E9C996]" />
      <DioramaStage
        analysis={analysis}
        mode={selected?.sceneMode ?? baseSceneMode(analysis.status)}
        facts={sceneFacts(analysis)}
        labels={false}
        camera={cam.camera}
        onRotate={cam.setRotation}
        onZoom={cam.setZoom}
        className="absolute -inset-x-2.5 top-6 bottom-2"
      />
      {selected ? (
        <div
          key={selected.id}
          role="status"
          className={cn(styles.toast, "absolute inset-x-3 top-3 flex items-center gap-2.5 rounded-2xl bg-paper py-2 pr-2 pl-3.5 shadow-[0_16px_32px_-18px_rgba(60,40,20,.45)]")}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[11px] font-extrabold tracking-[.06em] text-water-deep uppercase">Pokazujemy na polu</span>
            <span className="truncate text-sm font-extrabold">{selected.title}</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rosa-btn h-11 flex-none cursor-pointer rounded-[14px] border-2 border-border bg-paper px-3 text-sm font-bold text-foreground"
          >
            Pokaż suszę
          </button>
        </div>
      ) : (
        <>
          <span className="pointer-events-none absolute top-3 left-3 flex h-9 max-w-[calc(100%-150px)] items-center gap-1.5 truncate rounded-xl bg-paper px-3 text-[13px] font-bold tabular-nums">
            {weather} · {daysPl(status.windowDays)}: {signed(status.precipDeficitPct)}% deszczu
          </span>
          <DataStatusPill analysis={analysis} compact className="absolute top-3 right-3 rounded-xl" />
        </>
      )}
      <div className="absolute right-3 bottom-3 flex gap-1.5">
        <button
          type="button"
          aria-label="Widok z góry"
          aria-pressed={cam.camera.topView}
          onClick={cam.toggleTopView}
          className={cn("flex size-11 cursor-pointer items-center justify-center rounded-[14px]", cam.camera.topView ? "bg-primary" : "bg-foreground")}
        >
          <LayersIcon />
        </button>
        <button
          type="button"
          aria-label="Pełny ekran sceny"
          onClick={() => {
            const el = sceneRef.current
            if (!el) return
            if (document.fullscreenElement) void document.exitFullscreen()
            else if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined)
          }}
          className="flex size-11 cursor-pointer items-center justify-center rounded-[14px] bg-paper"
        >
          <FullscreenIcon />
        </button>
      </div>
    </section>
  )
}

function MobileStatus({ analysis }: { analysis: Analysis }) {
  const { status } = analysis
  const style = LEVEL_STYLE[status.level]
  return (
    <section aria-labelledby="m1" className={cn(styles.card, "flex flex-col gap-3 rounded-3xl p-[18px]")} style={{ background: style.soft }}>
      <h2 id="m1" className={headingCls}>
        1 · {statusTitle(analysis.request.date, analysis.generatedAt)}
      </h2>
      <div className="flex items-center gap-3.5">
        <span className="font-heading text-[64px] leading-none font-extrabold tabular-nums">
          {status.level}
          <span className="text-2xl text-ink-soft">/5</span>
        </span>
        <span className="font-heading text-[26px] leading-[1.05] font-extrabold" style={{ color: style.text }}>
          {status.label}
        </span>
      </div>
      <div role="img" aria-label={`Skala 1–5: obecnie ${status.level}`} className="flex items-center gap-[5px]">
        {SCALE.map((s) => (
          <span
            key={s.level}
            className={cn("flex-1", s.level === status.level ? "h-5 rounded-lg" : "h-3 rounded-md")}
            style={{
              background: s.color,
              boxShadow: s.level === status.level ? `0 0 0 2px ${style.soft}, 0 0 0 4px #2A2118` : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Mokro</span>
        <span>Susza ekstremalna</span>
      </div>
      <p className="m-0 text-[17px] leading-[1.45]">{status.summary}</p>
      <p className="m-0 text-xs text-ink-soft">{status.source}</p>
    </section>
  )
}

function MobileHistory({ analysis }: { analysis: Analysis }) {
  const { history } = analysis
  const current = analysisYear(analysis)
  return (
    <section
      aria-labelledby="m2"
      className={cn(styles.card, "flex flex-col gap-2.5 rounded-3xl bg-[#F8F1E5] p-[18px]")}
      style={{ "--i": 1 } as React.CSSProperties}
    >
      <h2 id="m2" className={headingCls}>
        2 · Na tle {history.totalYears} lat
      </h2>
      <p className="m-0 text-base leading-[1.45]">
        Deficyt w tym okresie był tu w{" "}
        <strong>
          <CountUp value={history.deficitYears} /> z {history.totalYears} lat
        </strong>
        . Najbardziej narażone: <strong>{history.riskMonths}</strong>.
      </p>
      <div
        role="img"
        aria-label={`Lata z deficytem: ${history.deficitYears} z ${history.totalYears}${history.years.some((y) => y.year === current && y.balanceMm < 0) ? `, w tym ${current}` : ""}`}
        className="flex gap-[5px]"
      >
        {history.years.map((y) => {
          const cur = y.year === current
          const deficit = y.balanceMm < 0
          return (
            <span key={y.year} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn("h-7 w-full rounded-lg", cur && "shadow-[0_0_0_2px_#F8F1E5,0_0_0_4px_#2A2118]")}
                style={{ background: deficit ? (cur ? "#A8432A" : "#D9822F") : "#CFE4E2" }}
              />
              <span className={cn("text-xs text-muted-foreground", cur ? "font-extrabold" : "font-medium")}>’{String(y.year).slice(2)}</span>
            </span>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px] bg-[#D9822F]" /> rok z deficytem
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px] bg-[#CFE4E2]" /> bez deficytu
        </span>
      </div>
    </section>
  )
}

function MobileCauses({ analysis }: { analysis: Analysis }) {
  return (
    <section aria-labelledby="m3" className={cn(styles.card, "flex flex-col gap-2.5")} style={{ "--i": 2 } as React.CSSProperties}>
      <h2 id="m3" className={cn(headingCls, "mx-1")}>
        3 · Dlaczego
      </h2>
      {analysis.causes.length === 0 && <p className="mx-1 my-0 text-[15px] leading-[1.45] text-muted-foreground">{noCausesText(analysis)}</p>}
      {analysis.causes.map((c) => {
        const style = CAUSE_STYLE[c.kind] ?? CAUSE_STYLE.opady
        return (
          <div key={c.id} className="flex items-center gap-3 rounded-[20px] p-3.5" style={{ background: style.bg }}>
            <span className="w-24 flex-none font-heading text-2xl font-extrabold tabular-nums" style={{ color: style.value }}>
              <CountableText text={c.value} />
            </span>
            <span className="flex flex-col text-[15px] leading-[1.4]">
              <span className="font-bold">{c.title}</span>
              <span className="text-muted-foreground">{c.detail}</span>
            </span>
          </div>
        )
      })}
    </section>
  )
}

function MobileActions({
  analysis,
  selectedId,
  onShow,
  onClear,
}: {
  analysis: Analysis
  selectedId: string | null
  onShow: (id: string) => void
  onClear: () => void
}) {
  const groups = groupedRecommendations(analysis.recommendations)
  const [expandedId, setExpandedId] = useState<string | null>(groups[0]?.items[0]?.id ?? null)
  const [ref, reveal] = useReveal<HTMLElement>()
  const order = new Map(groups.flatMap((g) => g.items).map((r, idx) => [r.id, idx]))

  return (
    <section ref={ref} data-reveal={reveal} aria-labelledby="m4" className={cn(styles.reveal, "flex flex-col gap-2.5")}>
      <h2 id="m4" className={cn(headingCls, "mx-1")}>
        4 · Co zrobić
      </h2>
      {groups.length === 0 && <p className="m-0 rounded-[20px] bg-muted px-4 py-3.5 text-[15px] leading-[1.45]">{noActionsText(analysis)}</p>}
      {groups.map((g, gi) => (
        <div key={g.id} className="flex flex-col gap-2.5">
          <span className={cn("mx-1 text-[15px] font-extrabold", gi === 0 ? "mt-1" : "mt-2")} style={{ color: g.label }}>
            {g.title}
            {g.optional && <span className="font-semibold text-muted-foreground"> · opcjonalnie</span>}
          </span>
          {g.items.map((r) => {
            const expanded = expandedId === r.id
            const onScene = selectedId === r.id
            const vars = { "--i": order.get(r.id) ?? 0 } as React.CSSProperties
            if (!expanded) {
              return (
                <div key={r.id} className={styles.card} style={vars}>
                  <button
                    type="button"
                    aria-expanded={false}
                    onClick={() => setExpandedId(r.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[20px] border-2 border-[#EFE3CF] bg-paper px-4 py-3.5 text-left text-foreground"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-base font-extrabold">{r.title}</span>
                      <span className="text-sm text-muted-foreground">{r.when}</span>
                    </span>
                    <span aria-hidden="true" className="text-xl text-muted-foreground">
                      ›
                    </span>
                  </button>
                </div>
              )
            }
            return (
              <div key={r.id} className={styles.card} style={vars}>
                <div className="flex flex-col gap-1.5 rounded-[20px] border-2 border-primary bg-[#EAF5F2] px-4 py-3.5">
                  <button
                    type="button"
                    aria-expanded
                    onClick={() => setExpandedId(null)}
                    className="cursor-pointer border-0 bg-transparent p-0 text-left text-[17px] font-extrabold text-foreground"
                  >
                    {r.title}
                  </button>
                  <span className="text-[15px] leading-[1.4] text-muted-foreground">{r.text}</span>
                  <div className="mt-1 flex items-center justify-between gap-2.5">
                    <span className="flex items-center gap-1.5 rounded-[10px] bg-paper px-2.5 py-1 text-[13px] font-bold">
                      <ClockIcon />
                      {r.when}
                    </span>
                    <button
                      type="button"
                      onClick={() => (onScene ? onClear() : onShow(r.id))}
                      className={cn(
                        "rosa-btn h-11 flex-none cursor-pointer rounded-[14px] px-3.5 text-sm font-bold",
                        onScene ? "border-2 border-primary bg-paper text-water-deep" : "border-0 bg-primary text-white",
                      )}
                    >
                      {onScene ? "Pokaż suszę" : "Pokaż na polu ↑"}
                    </button>
                  </div>
                  <div className={cn(styles.open, "mt-1.5 flex flex-col gap-1.5 rounded-2xl bg-white px-3.5 py-3")}>
                    <span className="text-sm font-extrabold">Dlaczego to polecamy</span>
                    <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm leading-[1.45] text-[#3A2F24]">
                      {r.why.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    {r.note && <p className="m-0 rounded-[10px] bg-[#FBEFD8] px-2.5 py-2 text-[13px] leading-[1.4] text-[#5A3E0A]">{r.note}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}

function MobileConfidence({ analysis }: { analysis: Analysis }) {
  const conf = CONFIDENCE[analysis.confidence.level]
  return (
    <section aria-labelledby="m5" className="flex flex-col gap-2.5 rounded-3xl bg-[#F8F1E5] p-[18px]">
      <h2 id="m5" className={headingCls}>
        5 · Pewność: {conf.label}
      </h2>
      <div role="img" aria-label={`Pewność ${conf.label}`} className="flex gap-1">
        {[1, 2, 3].map((b) => (
          <span key={b} className={cn("h-2.5 flex-1 rounded-[5px]", b <= conf.bars ? "bg-foreground" : "bg-border")} />
        ))}
      </div>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-[15px] leading-[1.4]">
        {analysis.confidence.unknowns.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
    </section>
  )
}

export function MobileResult({
  analysis,
  selected,
  onSelect,
  onClear,
  entrance = false,
  className,
}: {
  analysis: Analysis
  selected: Recommendation | null
  onSelect: (id: string) => void
  onClear: () => void
  entrance?: boolean
  className?: string
}) {
  const sceneRef = useRef<HTMLElement>(null)
  const staticMotion = useStaticMotion()
  const fetched = analysis.sources[0]?.fetchedAt

  return (
    <div className={cn("flex min-h-dvh flex-col bg-paper", className)}>
      <MobileHeader analysis={analysis} />
      <MobileScene analysis={analysis} selected={selected} onClear={onClear} sceneRef={sceneRef} />
      <main className={cn("mx-auto flex w-full max-w-2xl flex-1 flex-col gap-[18px] px-4 pt-5 pb-6", entrance && "animate-in duration-900 ease-out fade-in slide-in-from-bottom-24")}>
        <DemoBanner analysis={analysis} />
        <LiteBanner />
        <MobileStatus analysis={analysis} />
        <MobileHistory analysis={analysis} />
        <MobileCauses analysis={analysis} />
        <MobileActions
          analysis={analysis}
          selectedId={selected?.id ?? null}
          onShow={(id) => {
            onSelect(id)
            sceneRef.current?.scrollIntoView({ behavior: scrollBehavior(staticMotion), block: "start" })
          }}
          onClear={onClear}
        />
        <MobileConfidence analysis={analysis} />
        <p className="mx-1 my-0 text-xs leading-[1.5] text-ink-soft">
          Źródła: {analysis.sources.map((s) => s.name).join(", ")}
          {fetched ? ` · pobrano ${formatDatePl(fetched)}` : ""}
          {analysis.sources.some((s) => s.name === "IMGW-PIB") && <span className="mt-1 block">{analysis.sources.find((s) => s.name === "IMGW-PIB")?.license}</span>}
        </p>
      </main>
      <div className="no-print sticky bottom-0 z-10 flex gap-2.5 border-t border-input bg-[#FBF6EC] px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <a
          href={`/api/analyses/${analysis.id}/pdf`}
          download
          className="rosa-btn flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-primary text-[17px] font-extrabold text-white no-underline hover:text-white"
        >
          <DownloadIcon />
          Pobierz PDF
        </a>
        <Link
          href={`/raport/${analysis.id}?druk=1`}
          className="rosa-btn flex h-14 w-[110px] flex-none items-center justify-center rounded-[18px] border-2 border-border bg-paper text-base font-bold text-foreground no-underline hover:text-foreground"
        >
          Drukuj
        </Link>
      </div>
    </div>
  )
}
