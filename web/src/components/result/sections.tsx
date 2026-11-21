"use client"

import type { Analysis, Recommendation } from "@/lib/types"
import { formatDatePl } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { CountUp } from "./count-up"
import {
  CAUSE_STYLE,
  CONFIDENCE,
  LEVEL_STYLE,
  MINUS,
  SCALE,
  actionsSummary,
  analysisYear,
  groupedRecommendations,
  noActionsText,
  noCausesText,
  parseCountable,
} from "./format"
import { ArrowDownIcon, CauseIcon, ClockIcon, DropGauge, GroupIcon } from "./icons"
import { useReveal, useStaticMotion, scrollBehavior } from "./motion"
import styles from "./result.module.css"

export function SectionTitle({ n, id, children, inverted }: { n: number; id?: string; children: React.ReactNode; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <NumberBadge n={n} inverted={inverted} />
      <h2 id={id} tabIndex={id ? -1 : undefined} className="m-0 font-heading text-[22px] font-bold outline-none">
        {children}
      </h2>
    </div>
  )
}

function NumberBadge({ n, inverted }: { n: number; inverted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 flex-none items-center justify-center rounded-[10px] text-sm font-extrabold",
        inverted ? "bg-white text-primary" : "bg-foreground text-paper",
      )}
    >
      {n}
    </span>
  )
}

export function Divider() {
  return <hr className="m-0 border-0 border-t border-dashed border-border" />
}

export function SourceLine({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs text-ink-soft">{children}</p>
}

export function CountableText({ text }: { text: string }) {
  const c = parseCountable(text)
  if (!c) return <>{text}</>
  return <CountUp value={c.value} prefix={c.prefix} suffix={c.suffix} decimals={c.decimals} />
}

export function StatusSection({ analysis }: { analysis: Analysis }) {
  const { status } = analysis
  const style = LEVEL_STYLE[status.level]
  return (
    <section aria-labelledby="s1" className={cn(styles.card, "flex flex-col gap-3.5")}>
      <SectionTitle n={1} id="s1">
        Stan wody teraz
      </SectionTitle>
      <div className="flex items-center gap-[18px]">
        <div className="relative size-[132px] flex-none">
          <DropGauge fill={style.drop} />
          <span className="absolute inset-x-0 top-[54px] text-center font-heading text-[58px] leading-none font-extrabold tabular-nums">
            {status.level}
            <span className="text-2xl text-ink-soft">/5</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-heading text-[30px] leading-[1.05] font-extrabold" style={{ color: style.text }}>
            {status.label}
          </span>
          <p className="m-0 text-lg leading-[1.45]">{status.summary}</p>
        </div>
      </div>
      <DroughtScale level={status.level} label={status.label} />
      <SourceLine>Źródło: {status.source}</SourceLine>
    </section>
  )
}

function DroughtScale({ level, label }: { level: number; label: string }) {
  return (
    <div role="img" aria-label={`Skala od 1 do 5: obecnie ${level}, ${label.toLowerCase()}`} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {SCALE.map((s) => (
          <span
            key={s.level}
            className={cn(
              "flex-1",
              s.level === level ? "h-6 rounded-[9px] shadow-[0_0_0_3px_#FFFDF8,0_0_0_5px_#2A2118]" : "h-3.5 rounded-[7px]",
            )}
            style={{ background: s.color }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 text-center text-xs text-muted-foreground">
        {SCALE.map((s) => (
          <span key={s.level} className={cn("flex-1", s.level === level && "font-extrabold text-foreground")}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function historyAriaLabel(analysis: Analysis): string {
  const { years } = analysis.history
  const current = analysisYear(analysis)
  const deficit = years.filter((y) => y.balanceMm < 0).map((y) => String(y.year))
  const list = deficit.length > 1 ? `${deficit.slice(0, -1).join(", ")} i ${deficit[deficit.length - 1]}` : (deficit[0] ?? "brak")
  const cur = years.find((y) => y.year === current)
  const first = years[0]?.year
  const last = years[years.length - 1]?.year
  const curText = cur
    ? `; w ${current} ${cur.balanceMm < 0 ? "minus" : "plus"} ${Math.abs(cur.balanceMm)} mm względem normy`
    : ""
  return `Bilans wodny ${first}–${last}: deficyt w latach ${list}${curText}`
}

export function HistorySection({ analysis }: { analysis: Analysis }) {
  const { history } = analysis
  const current = analysisYear(analysis)
  const maxPos = Math.max(1, ...history.years.map((y) => Math.max(0, y.balanceMm)))
  const maxNeg = Math.max(1, ...history.years.map((y) => Math.max(0, -y.balanceMm)))
  const posScale = Math.min(1, 40 / maxPos)
  const negScale = Math.min(0.82, 78 / maxNeg)

  return (
    <section aria-labelledby="s2" className={cn(styles.card, "flex flex-col gap-3")} style={{ "--i": 1 } as React.CSSProperties}>
      <SectionTitle n={2} id="s2">
        Na tle {history.totalYears} lat
      </SectionTitle>
      <p className="m-0 text-[17px] leading-[1.45]">
        W tym okresie deficyt wody był tu w{" "}
        <strong>
          <CountUp value={history.deficitYears} /> z {history.totalYears} lat
        </strong>
        . Najbardziej narażone miesiące: <strong>{history.riskMonths}</strong>.
      </p>
      <div role="img" aria-label={historyAriaLabel(analysis)} className="flex flex-col gap-1.5 rounded-[18px] bg-[#F8F1E5] px-3.5 pt-3.5 pb-2.5">
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{history.windowLabel}</span>
          <span className="flex flex-none gap-3">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px] bg-water" /> nadmiar
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px] bg-[#D9822F]" /> deficyt
            </span>
          </span>
        </div>
        <div aria-hidden="true" className="flex items-stretch gap-1.5">
          {history.years.map((y, i) => {
            const cur = y.year === current
            const pos = Math.round(Math.max(0, y.balanceMm) * posScale)
            const neg = Math.round(Math.max(0, -y.balanceMm) * negScale)
            const vars = { "--i": i } as React.CSSProperties
            return (
              <div key={y.year} className="flex flex-1 flex-col items-center">
                <div className="flex h-10 w-full items-end justify-center">
                  {pos > 0 && (
                    <span
                      className={cn(styles.barUp, "w-[70%] rounded-t-[6px] rounded-b-[2px]", cur ? "bg-water-deep shadow-[0_0_0_2px_#FFFDF8,0_0_0_4px_#2A2118]" : "bg-water")}
                      style={{ ...vars, height: pos }}
                    />
                  )}
                </div>
                <div className="h-0.5 w-full bg-muted-foreground" />
                <div className="flex h-[100px] w-full flex-col items-center justify-start">
                  {neg > 0 && (
                    <span
                      className={cn(
                        styles.barDown,
                        "w-[70%] rounded-t-[2px] rounded-b-[6px]",
                        cur ? "bg-[#A8432A] shadow-[0_0_0_2px_#FFFDF8,0_0_0_4px_#2A2118]" : "bg-[#D9822F]",
                      )}
                      style={{ ...vars, height: neg }}
                    />
                  )}
                  {cur && (
                    <span className="mt-1 text-xs font-extrabold whitespace-nowrap text-[#8A3A22] tabular-nums">
                      {y.balanceMm < 0 ? (
                        <CountUp value={Math.abs(y.balanceMm)} prefix={MINUS} suffix=" mm" />
                      ) : (
                        `+${y.balanceMm} mm`
                      )}
                    </span>
                  )}
                </div>
                <span className={cn("text-xs text-muted-foreground tabular-nums", cur ? "font-extrabold" : "font-medium")}>{y.year}</span>
              </div>
            )
          })}
        </div>
      </div>
      <SourceLine>Źródło: {history.source}</SourceLine>
    </section>
  )
}

export function CausesSection({ analysis }: { analysis: Analysis }) {
  return (
    <section aria-labelledby="s3" className={cn(styles.card, "flex flex-col gap-3")} style={{ "--i": 2 } as React.CSSProperties}>
      <SectionTitle n={3} id="s3">
        {analysis.status.level >= 3 ? "Dlaczego brakuje wody" : "Co wpływa na wodę na polu"}
      </SectionTitle>
      {analysis.causes.length === 0 && <p className="m-0 text-[15px] leading-[1.45] text-muted-foreground">{noCausesText(analysis)}</p>}
      {analysis.causes.map((c) => {
        const style = CAUSE_STYLE[c.kind] ?? CAUSE_STYLE.opady
        return (
          <div key={c.id} className="flex items-start gap-3.5 rounded-[20px] p-3.5" style={{ background: style.bg }}>
            <CauseIcon kind={c.kind} />
            <div className="flex flex-col gap-0.5">
              <span className="font-heading text-[28px] leading-[1.1] font-extrabold tabular-nums" style={{ color: style.value }}>
                <CountableText text={c.value} />
              </span>
              <span className="text-base font-bold">{c.title}</span>
              <span className="text-[15px] leading-[1.4] text-muted-foreground">{c.detail}</span>
              <span className="text-xs text-ink-soft">{c.source}</span>
            </div>
          </div>
        )
      })}
    </section>
  )
}

export function JumpToActions({ analysis, targetId }: { analysis: Analysis; targetId: string }) {
  const staticMotion = useStaticMotion()
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        const target = document.getElementById(targetId)
        if (!target) return
        e.preventDefault()
        target.scrollIntoView({ behavior: scrollBehavior(staticMotion), block: "start" })
        target.focus({ preventScroll: true })
      }}
      className="group/jump block no-underline"
    >
      <span
        className={cn(
          styles.card,
          "flex items-center justify-between gap-3 rounded-[20px] bg-primary px-5 py-4 text-white transition-transform duration-300 ease-spring group-hover/jump:-translate-y-0.5 group-hover/jump:scale-[1.02] group-active/jump:scale-[.96]",
        )}
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <span className="flex items-center gap-3">
          <NumberBadge n={4} inverted />
          <span className="flex flex-col">
            <span className="font-heading text-[22px] font-bold">Co zrobić</span>
            <span className="text-[15px] opacity-90">{actionsSummary(analysis.recommendations)}</span>
          </span>
        </span>
        <ArrowDownIcon />
      </span>
    </a>
  )
}

function RecommendationCard({
  rec,
  index,
  selected,
  onToggle,
}: {
  rec: Recommendation
  index: number
  selected: boolean
  onToggle: (id: string) => void
}) {
  const panelId = `rec-${rec.id}-why`
  return (
    <div className={styles.card} style={{ "--i": index } as React.CSSProperties}>
      <div
        className={cn(
          styles.rec,
          "overflow-hidden rounded-[20px] border-2",
          selected ? "border-primary bg-[#EAF5F2]" : "border-[#EFE3CF] bg-paper",
        )}
      >
        <button
          type="button"
          aria-expanded={selected}
          aria-controls={panelId}
          onClick={() => onToggle(rec.id)}
          className="flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent px-4 py-3.5 text-left text-inherit"
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-[3px] size-[22px] flex-none rounded-full border-2",
              selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_#EAF5F2]" : "border-[#CDBB9C] bg-white shadow-[inset_0_0_0_3px_#FFFDF8]",
            )}
          />
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-[17px] leading-[1.25] font-extrabold">{rec.title}</span>
            <span className="text-[15px] leading-[1.4] text-muted-foreground">{rec.text}</span>
            <span className="mt-1 flex items-center gap-1.5 self-start rounded-[10px] bg-background px-2.5 py-1 text-[13px] font-bold">
              <ClockIcon />
              {rec.when}
            </span>
          </span>
          <span className="mt-0.5 text-sm font-bold whitespace-nowrap text-water-deep">{selected ? "Na scenie" : "Pokaż na polu"}</span>
        </button>
        {selected && (
          <div id={panelId} className={cn(styles.open, "mx-4 mb-4 ml-[50px] flex flex-col gap-2 rounded-2xl bg-white px-4 py-3.5")}>
            <span className="text-sm font-extrabold">Dlaczego to polecamy</span>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-[18px] text-sm leading-[1.45] text-[#3A2F24]">
              {rec.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            {rec.note && <p className="m-0 rounded-[10px] bg-[#FBEFD8] px-2.5 py-2 text-[13px] leading-[1.4] text-[#5A3E0A]">{rec.note}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export function ActionsSection({
  analysis,
  selectedId,
  onToggle,
  headingId,
}: {
  analysis: Analysis
  selectedId: string | null
  onToggle: (id: string) => void
  headingId: string
}) {
  const [ref, reveal] = useReveal<HTMLElement>()
  const groups = groupedRecommendations(analysis.recommendations).reduce<
    { group: ReturnType<typeof groupedRecommendations>[number]; start: number }[]
  >((acc, g) => {
    const prev = acc[acc.length - 1]
    acc.push({ group: g, start: prev ? prev.start + prev.group.items.length + 1 : 0 })
    return acc
  }, [])
  return (
    <section ref={ref} data-reveal={reveal} aria-labelledby={headingId} className={cn(styles.reveal, "flex scroll-mt-4 flex-col gap-5")}>
      <div className="flex items-center gap-2.5">
        <NumberBadge n={4} />
        <h2 id={headingId} tabIndex={-1} className="m-0 font-heading text-[22px] font-bold outline-none">
          Co zrobić
        </h2>
        <span className="ml-auto text-sm text-ink-soft">od najważniejszego</span>
      </div>
      {groups.length === 0 && <p className="m-0 rounded-[20px] bg-muted px-4 py-3.5 text-[15px] leading-[1.45]">{noActionsText(analysis)}</p>}
      {groups.map(({ group: g, start }) => (
        <section key={g.id} aria-label={g.title} className="flex flex-col gap-2.5">
          <div className={cn(styles.card, "flex items-center gap-2.5")} style={{ "--i": start } as React.CSSProperties}>
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl" style={{ background: g.tint }}>
              <GroupIcon group={g.id} />
            </span>
            <h3 className="m-0 text-lg font-extrabold">{g.title}</h3>
            {g.optional && <span className="rounded-full bg-muted px-2.5 py-[3px] text-[13px] font-bold text-muted-foreground">opcjonalnie</span>}
          </div>
          {g.items.map((r, i) => (
            <RecommendationCard key={r.id} rec={r} index={start + i + 1} selected={selectedId === r.id} onToggle={onToggle} />
          ))}
        </section>
      ))}
    </section>
  )
}

export function ConfidenceSection({ analysis }: { analysis: Analysis }) {
  const conf = CONFIDENCE[analysis.confidence.level]
  return (
    <section aria-labelledby="s5" className="flex flex-col gap-3">
      <SectionTitle n={5} id="s5">
        Pewność i czego nie wiemy
      </SectionTitle>
      <div className="flex items-center gap-3.5">
        <div role="img" aria-label={`Pewność wyniku: ${conf.label}`} className="flex gap-1">
          {[1, 2, 3].map((b) => (
            <span key={b} className={cn("h-3 w-[34px] rounded-md", b <= conf.bars ? "bg-foreground" : "bg-border")} />
          ))}
        </div>
        <span className="text-lg font-extrabold">Pewność: {conf.label}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {analysis.confidence.unknowns.map((u) => (
          <li key={u} className="flex gap-2.5 text-[15px] leading-[1.4]">
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-lg bg-muted text-[13px] font-extrabold"
            >
              ?
            </span>
            {u}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SourcesFooter({ analysis }: { analysis: Analysis }) {
  return (
    <footer className="flex flex-col gap-1.5 rounded-2xl bg-[#F8F1E5] px-4 py-3.5">
      <span className="text-[13px] font-extrabold">Źródła</span>
      {analysis.sources.map((s) => (
        <span key={s.key + s.name} className="text-xs leading-[1.4] text-muted-foreground">
          <strong className="text-foreground">{s.name}</strong> — {s.what} · pobrano {formatDatePl(s.fetchedAt)} · {s.license}
        </span>
      ))}
    </footer>
  )
}

