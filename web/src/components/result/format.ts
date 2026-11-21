import type { Analysis, ConfidenceLevel, DroughtLevel, Parcel, Recommendation, RecommendationGroup } from "@/lib/types"

export const MINUS = "−"

export function signed(n: number): string {
  return n < 0 ? `${MINUS}${Math.abs(n)}` : String(n)
}

export function numberPl(n: number, decimals = 0): string {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function pluralPl(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const d = n % 10
  const dd = n % 100
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many
}

export function daysPl(n: number): string {
  return `${n} ${n === 1 ? "dnia" : "dni"}`
}

export function placeLine(parcel: Parcel): string {
  return `${parcel.obreb}, gm. ${parcel.gmina}, ${parcel.wojewodztwo} · ${numberPl(parcel.areaHa, 1)} ha`
}

export const SCALE: { level: DroughtLevel; label: string; color: string }[] = [
  { level: 1, label: "Mokro", color: "#3C8D86" },
  { level: 2, label: "W normie", color: "#7FAE5A" },
  { level: 3, label: "Umiarkowana", color: "#E2B83E" },
  { level: 4, label: "Silna", color: "#D9822F" },
  { level: 5, label: "Ekstremalna", color: "#A8432A" },
]

export const LEVEL_STYLE: Record<DroughtLevel, { drop: string; text: string; soft: string }> = {
  1: { drop: "#BFE0DC", text: "#0B5A5E", soft: "#E6F2EF" },
  2: { drop: "#D6E7B9", text: "#4A6B22", soft: "#EEF3E0" },
  3: { drop: "#F6D98A", text: "#8A5A00", soft: "#FBF1DA" },
  4: { drop: "#F3C08F", text: "#8A3A22", soft: "#FBE7D6" },
  5: { drop: "#EBA88F", text: "#7A2E18", soft: "#F6E0D6" },
}

export const CAUSE_STYLE: Record<string, { bg: string; value: string }> = {
  opady: { bg: "#FBEFE6", value: "#8A3A22" },
  gleba: { bg: "#F6EEDC", value: "#6B4A10" },
  spadek: { bg: "#EAF2EF", value: "#0B5A5E" },
  upal: { bg: "#FBEFE6", value: "#8A3A22" },
  uprawa: { bg: "#EEF3E2", value: "#4A5420" },
  rosliny: { bg: "#F4EFD9", value: "#5E5320" },
  rzeka: { bg: "#E4F0F2", value: "#0B5A5E" },
  gruntowe: { bg: "#EEF0E6", value: "#3F5A6B" },
}

export const GROUPS: { id: RecommendationGroup; title: string; tint: string; label: string; optional: boolean }[] = [
  { id: "woda", title: "Zatrzymaj wodę", tint: "#0E6E73", label: "#0B5A5E", optional: false },
  { id: "gleba", title: "Zadbaj o glebę", tint: "#5F6B2E", label: "#4A5420", optional: false },
  { id: "irr", title: "Nawadnianie", tint: "#2F7DA0", label: "#245F7A", optional: true },
]

export function groupTint(group: RecommendationGroup): string {
  return GROUPS.find((g) => g.id === group)?.tint ?? "#0E6E73"
}

export function groupedRecommendations(recs: Recommendation[]) {
  return GROUPS.map((g) => ({ ...g, items: recs.filter((r) => r.group === g.id) })).filter((g) => g.items.length > 0)
}

export const CONFIDENCE: Record<ConfidenceLevel, { label: string; bars: number }> = {
  niska: { label: "niska", bars: 1 },
  srednia: { label: "średnia", bars: 2 },
  wysoka: { label: "wysoka", bars: 3 },
}

const START_PHRASE: Record<string, string> = {
  zastawka: "zastawki na rowie",
  miedzyplon: "międzyplonu",
  resztki: "resztek pożniwnych",
  orka: "ograniczenia orki",
  nawadnianie: "nawadniania",
}

export function actionsSummary(recs: Recommendation[]): string {
  const ordered = groupedRecommendations(recs).flatMap((g) => g.items)
  const n = ordered.length
  if (n === 0) return "brak działań do polecenia dla tej działki"
  const head = `${n} ${pluralPl(n, "działanie", "działania", "działań")}`
  const first = ordered[0]
  if (!first) return head
  const phrase = START_PHRASE[first.id]
  return phrase ? `${head} · zacznij od ${phrase}` : `${head} · zacznij od: ${first.title.toLowerCase()}`
}

export function analysisYear(analysis: Analysis): number {
  const y = Number(analysis.request.date.slice(0, 4))
  const years = analysis.history.years
  return years.some((h) => h.year === y) ? y : (years[years.length - 1]?.year ?? y)
}

export function ndviPosition(ndvi: number): number {
  return Math.min(100, Math.max(0, ((ndvi - 0.1) / 0.9) * 100))
}

export type Countable = { prefix: string; value: number; suffix: string; decimals: number }

export function parseCountable(text: string): Countable | null {
  const m = /^([−-]?)(\d+(?:[.,]\d+)?)(\s*\D*)$/.exec(text.trim())
  if (!m) return null
  const raw = m[2].replace(",", ".")
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0
  return { prefix: m[1] ? MINUS : "", value: Number(raw), suffix: m[3], decimals }
}

export function noCausesText(analysis: Analysis): string {
  return analysis.status.level >= 3
    ? "Nie udało się wskazać jednej wyraźnej przyczyny; to suma kilku słabszych czynników."
    : "Opady i parowanie są blisko normy, a gleba i ukształtowanie terenu nie zwiększają tu ryzyka suszy."
}

export function noActionsText(analysis: Analysis): string {
  const nonAgri = analysis.confidence.unknowns.find((u) => u.startsWith("W ewidencji to"))
  return nonAgri ?? "Sytuacja wodna jest dobra i nie widzimy pilnych działań. Wróć do analizy, gdy zacznie brakować deszczu."
}
