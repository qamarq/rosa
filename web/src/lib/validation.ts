const PARCEL_ID = /^\d{6}_\d\.\d{4}(\.[\w/.-]+)+$/

export function isValidParcelId(value: string): boolean {
  return PARCEL_ID.test(value.trim())
}

export const MAX_PARCELS = 10

export function splitParcelIds(text: string): string[] {
  return [...new Set(text.split(/[\s,;+]+/).filter(Boolean))].sort()
}

export function parcelKey(ids: string[]): string {
  return splitParcelIds(ids.join("+")).join("+")
}

export function parcelSelectionProblem(ids: string[]): string | null {
  if (ids.length === 0) return "Wpisz numer działki."
  const bad = ids.find((id) => !isValidParcelId(id))
  if (bad) return ids.length > 1 ? `Numer ${bad} nie wygląda na numer działki.` : "To nie wygląda na numer działki."
  if (ids.length > MAX_PARCELS) return `Pole może mieć najwyżej ${MAX_PARCELS} działek.`
  if (new Set(ids.map((id) => id.slice(0, 2))).size > 1) return "Wszystkie działki pola muszą leżeć w tym samym województwie."
  return null
}

export function isValidParcelKey(key: string): boolean {
  return parcelSelectionProblem(splitParcelIds(key)) === null
}

export function fieldTitle(ids: string[]): string {
  return ids.length > 1 ? `Pole z ${ids.length} działek · ${ids[0]} + ${ids.length - 1}` : `Działka ${ids[0] ?? ""}`
}

export function fieldSearchText(key: string): string {
  const ids = splitParcelIds(key)
  return ids.length > 1 ? `Szukamy pola z ${ids.length} działek · ${fieldShortId(ids)}…` : `Szukamy działki ${key}…`
}

export function fieldShortId(ids: string[]): string {
  return ids.length > 1 ? `${ids[0]} + ${ids.length - 1}` : (ids[0] ?? "")
}

export const HISTORY_YEARS = 10

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function dateRange(today = new Date()): { min: string; max: string } {
  const min = new Date(today)
  min.setFullYear(today.getFullYear() - HISTORY_YEARS)
  return { min: toIsoDate(min), max: toIsoDate(today) }
}

export function isDateInRange(iso: string, today = new Date()): boolean {
  const { min, max } = dateRange(today)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= min && iso <= max
}

export function formatDatePl(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

export function isCurrentDate(date: string, generatedAt: string): boolean {
  const ref = new Date(generatedAt)
  ref.setUTCDate(ref.getUTCDate() - 1)
  return date >= ref.toISOString().slice(0, 10)
}

export function statusTitle(date: string, generatedAt: string): string {
  return isCurrentDate(date, generatedAt) ? "Stan wody teraz" : `Stan wody ${formatDatePl(date)}`
}
