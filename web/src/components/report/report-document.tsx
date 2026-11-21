import { baseSceneMode, sceneFacts } from "@/lib/scene"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { Analysis, ConfidenceLevel, Recommendation, RecommendationGroup } from "@/lib/types"
import { formatDatePl } from "@/lib/validation"
import { ReportScene } from "@/components/report/report-scene"
import styles from "@/components/report/report.module.css"

const GROUP_ORDER: RecommendationGroup[] = ["woda", "gleba", "irr"]

const GROUP_LABEL: Record<RecommendationGroup, string> = {
  woda: "Zatrzymaj wodę",
  gleba: "Zadbaj o glebę",
  irr: "Nawadnianie (opcjonalnie)",
}

const CONFIDENCE: Record<ConfidenceLevel, { label: string; filled: number }> = {
  niska: { label: "Niska", filled: 1 },
  srednia: { label: "Średnia", filled: 2 },
  wysoka: { label: "Wysoka", filled: 3 },
}

const LEVEL_FILL = ["#FFFFFF", "#E6E6E6", "#A8A8A8", "#6A6A6A", "#222222"]

const areaFormat = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 })
const ndviFormat = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function orderRecommendations(list: Recommendation[]): Recommendation[] {
  return GROUP_ORDER.flatMap((group) => list.filter((r) => r.group === group))
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-[13px] font-extrabold tracking-[.06em] uppercase break-after-avoid">{children}</h2>
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
      <path d="M17 3 C 12 10, 6 16, 6 22 A 11 11 0 0 0 28 22 C 28 16, 22 10, 17 3 Z" fill="#111111" />
      <path d="M11.5 22 A 5.5 5.5 0 0 0 17 27.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function ReportDocument({ analysis }: { analysis: Analysis }) {
  const { parcel, status, history, causes, recommendations, confidence, sources, sourceStatus, vegetation } = analysis
  const years = [...history.years].sort((a, b) => a.year - b.year)
  const currentYear = Number(analysis.request.date.slice(0, 4))
  const firstYear = years[0]?.year
  const lastYear = years[years.length - 1]?.year
  const ordered = orderRecommendations(recommendations)
  const conf = CONFIDENCE[confidence.level]
  const unavailable = sourceStatus.filter((s) => !s.ok)
  const generated = formatDatePl(analysis.generatedAt.slice(0, 10))

  return (
    <article
      className={cn(
        "mx-auto flex w-full max-w-[794px] flex-col gap-3.5 bg-white px-4 pt-6 pb-5 font-sans text-[#111111] sm:min-h-[1123px] sm:px-12 sm:pt-11 sm:pb-9",
        styles.sheet
      )}
      aria-label={`Raport stanu wody na działce ${parcel.id}`}
    >
      <header className="flex flex-col gap-3 border-b-2 border-[#111111] pb-2.5 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="flex flex-col">
            <span className="font-heading text-2xl leading-none font-extrabold">ROSA</span>
            <span className="text-xs text-[#444444]">Retencja · Opady · Susza · Analiza</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 sm:text-right print:text-right">
          <h1 className="m-0 font-heading text-[22px] leading-tight font-extrabold">Raport stanu wody na działce</h1>
          <span className="text-xs text-[#444444] tabular-nums">
            Dzień analizy: {formatDatePl(analysis.request.date)} · wygenerowano: {generated}
          </span>
        </div>
      </header>

      <p className="m-0 text-[13px] leading-[1.4]">
        <strong className="tabular-nums">Działka {parcel.id}</strong> · {parcel.obreb}, gm. {parcel.gmina}, woj.{" "}
        {parcel.wojewodztwo} · {areaFormat.format(parcel.areaHa)} ha · uprawa: {analysis.cropLabel.toLocaleLowerCase("pl")}
      </p>

      <div className="flex flex-col gap-5 sm:flex-row print:flex-row">
        <figure className="m-0 flex flex-col gap-1.5 break-inside-avoid sm:w-[330px] sm:flex-[0_0_330px] print:w-[330px] print:flex-[0_0_330px]">
          <figcaption className="text-xs text-[#333333]">
            Ryc. 1. Działka teraz: {status.label.toLocaleLowerCase("pl")}, {status.headline.toLocaleLowerCase("pl")}
          </figcaption>
          <ReportScene
            mode={baseSceneMode(status)}
            facts={sceneFacts(analysis)}
            label={`Scena działki ${parcel.id}: ${status.label}. ${status.summary}`}
          />
          <span className="text-xs text-[#444444]">Statyczny render sceny.</span>
        </figure>

        <div className="flex flex-1 flex-col gap-3">
          <section className="flex flex-col gap-2 rounded-[10px] border-2 border-[#111111] px-3.5 py-3 break-inside-avoid">
            <SectionTitle>1. Stan wody teraz</SectionTitle>
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-heading text-[44px] leading-none font-extrabold tabular-nums">{status.level}/5</span>
              <span className="font-heading text-[22px] font-extrabold">{status.label}</span>
            </div>
            <div className="flex gap-1" role="img" aria-label={`Skala 1–5, zaznaczone ${status.level}`}>
              {LEVEL_FILL.map((fill, i) => (
                <span
                  key={fill}
                  className={cn("h-3 flex-1 border-[#111111]", i + 1 === status.level ? "border-[3px]" : "border")}
                  style={{ background: fill }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-[#333333]" aria-hidden="true">
              <span>1 mokro</span>
              <span>3 umiarkowana</span>
              <span>5 ekstremalna</span>
            </div>
            <p className="m-0 text-[13px] leading-[1.45]">{status.summary}</p>
            {vegetation && (
              <p className="m-0 text-xs leading-[1.4] text-[#333333]">
                Kondycja roślin (NDVI): {ndviFormat.format(vegetation.ndvi)}, {vegetation.label} · zdjęcie z{" "}
                {formatDatePl(vegetation.imageDate)}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-1.5 break-inside-avoid">
            <SectionTitle>2. Na tle {history.totalYears} lat</SectionTitle>
            <p className="m-0 text-[13px] leading-[1.45]">
              Deficyt wody w tym okresie wystąpił w{" "}
              <strong>
                {history.deficitYears} z {history.totalYears} lat
              </strong>
              {firstYear !== undefined && lastYear !== undefined ? ` (${firstYear}–${lastYear})` : ""}. Najbardziej
              narażone: {history.riskMonths}.
            </p>
            <div className="flex gap-[3px]" role="img" aria-label="Lata z deficytem zaznaczone na czarno">
              {years.map((y) => {
                const current = y.year === currentYear
                const deficit = y.balanceMm < 0
                return (
                  <span key={y.year} className="flex flex-1 flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        "box-border h-3.5 w-full border-[#111111]",
                        current ? "border-[3px]" : "border",
                        deficit ? "bg-[#111111]" : "bg-white"
                      )}
                    />
                    <span className={cn("text-xs tabular-nums", current ? "font-extrabold" : "font-medium")}>
                      {String(y.year).slice(2)}
                    </span>
                  </span>
                )
              })}
            </div>
            <span className="text-xs text-[#444444]">{history.windowLabel}. Czarne pole = rok z deficytem.</span>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-1.5 break-inside-avoid">
        <SectionTitle>3. Dlaczego brakuje wody</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 print:grid-cols-3">
          {causes.map((c) => (
            <div key={c.id} className="flex flex-col gap-0.5 rounded-lg border border-[#111111] px-3 py-2.5 break-inside-avoid">
              <span className="font-heading text-xl font-extrabold">{c.value}</span>
              <span className="text-xs leading-[1.4] font-bold">{c.title}</span>
              <span className="text-xs leading-[1.4]">{c.detail}</span>
              <span className="text-xs leading-[1.4] text-[#444444]">Źródło: {c.source}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>4. Co zrobić</SectionTitle>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[560px] border-collapse text-xs leading-[1.35] print:min-w-0">
            <thead>
              <tr className="border-b-2 border-[#111111] text-left">
                <th scope="col" className="w-6 px-1.5 py-[5px]">Nr</th>
                <th scope="col" className="px-1.5 py-[5px]">Działanie</th>
                <th scope="col" className="w-[130px] px-1.5 py-[5px]">Grupa</th>
                <th scope="col" className="w-[150px] px-1.5 py-[5px]">Kiedy</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((r, i) => (
                <tr key={r.id} className="border-b border-[#111111] align-top break-inside-avoid">
                  <td className="px-1.5 py-[5px] font-extrabold">{i + 1}</td>
                  <td className="px-1.5 py-[5px]">
                    <div className="flex flex-col gap-1">
                      <span>
                        <strong>{r.title}</strong>. {r.text}
                      </span>
                      {r.why.length > 0 && (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold">Dlaczego:</span>
                          <ul className="m-0 list-disc pl-4 text-[#333333]">
                            {r.why.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.note && (
                        <span className="border-l-2 border-[#111111] pl-2">
                          <strong>Uwaga:</strong> {r.note}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1.5 py-[5px]">{GROUP_LABEL[r.group]}</td>
                  <td className="px-1.5 py-[5px]">{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3.5 rounded-lg border border-dashed border-[#111111] px-3 py-2.5 break-inside-avoid sm:flex-row print:flex-row">
        <div className="flex flex-col gap-1 sm:flex-[0_0_150px] print:flex-[0_0_150px]">
          <SectionTitle>5. Pewność</SectionTitle>
          <span className="text-base font-extrabold">{conf.label}</span>
          <div className="flex max-w-[150px] gap-[3px]" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn("box-border h-2 flex-1", n <= conf.filled ? "bg-[#111111]" : "border border-[#111111]")}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-[3px]">
          <span className="text-xs font-extrabold">Czego nie wiemy</span>
          <ul className="m-0 list-disc pl-4 text-xs leading-[1.45]">
            {confidence.unknowns.map((u) => (
              <li key={u}>{u}</li>
            ))}
            {unavailable.map((s) => (
              <li key={s.key}>
                Brak danych: {s.label}
                {s.message ? ` (${s.message})` : ""}.
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-1.5 break-inside-avoid">
        <SectionTitle>6. Źródła danych</SectionTitle>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[560px] border-collapse text-xs leading-[1.3] print:min-w-0">
            <thead>
              <tr className="border-b-2 border-[#111111] text-left">
                <th scope="col" className="px-1.5 py-1">Źródło</th>
                <th scope="col" className="px-1.5 py-1">Co z niego bierzemy</th>
                <th scope="col" className="w-[84px] px-1.5 py-1">Pobrano</th>
                <th scope="col" className="w-[170px] px-1.5 py-1">Licencja</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.key} className="border-b border-[#111111] break-inside-avoid">
                  <td className="px-1.5 py-1">{s.name}</td>
                  <td className="px-1.5 py-1">{s.what}</td>
                  <td className="px-1.5 py-1 tabular-nums">{formatDatePl(s.fetchedAt)}</td>
                  <td className="px-1.5 py-1">{s.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-auto flex flex-col gap-1 border-t border-[#111111] pt-2 text-xs text-[#333333] break-inside-avoid sm:flex-row sm:justify-between print:flex-row print:justify-between">
        <span>Raport poglądowy — nie zastępuje opinii doradcy rolniczego.</span>
        <span className="tabular-nums">rosa · wygenerowano {generated}</span>
      </footer>
    </article>
  )
}
