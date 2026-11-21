const PARCEL_ID = /^\d{6}_\d\.\d{4}(\.[\w/.-]+)+$/

export function isValidParcelId(value: string): boolean {
  return PARCEL_ID.test(value.trim())
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
