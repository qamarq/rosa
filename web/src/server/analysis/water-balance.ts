import type { DailySeries } from "@/server/sources/meteo"
import { MONTHS_PL } from "./crop-profiles"

export type YearWindow = { year: number; precip: number; et0: number; balance: number; tmaxMean: number; complete: boolean }

export type BalanceResult = {
  windowDays: number
  current: YearWindow
  previous: YearWindow[]
  normal: { precip: number; et0: number; balance: number; tmaxMean: number; balanceSd: number }
  z: number
  precipDeficitMm: number
  precipDeficitPct: number
  tmaxAnomaly: number
  last7: { precip: number; et0: number }
  riskMonths: string
  monthlyMeanBalance: number[]
}

function shiftYear(iso: string, years: number): string {
  const y = Number(iso.slice(0, 4)) + years
  const md = iso.slice(4)
  return md === "-02-29" ? `${y}-02-28` : `${y}${md}`
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function windowFor(s: DailySeries, end: string, days: number, year: number): YearWindow {
  const start = addDays(end, -(days - 1))
  let precip = 0, et0 = 0, tsum = 0, tn = 0, n = 0
  for (let i = 0; i < s.dates.length; i++) {
    const d = s.dates[i]
    if (d < start || d > end) continue
    n++
    precip += s.precip[i]
    et0 += s.et0[i]
    if (Number.isFinite(s.tmax[i])) {
      tsum += s.tmax[i]
      tn++
    }
  }
  return { year, precip, et0, balance: precip - et0, tmaxMean: tn ? tsum / tn : Number.NaN, complete: n >= days - 2 }
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function sd(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

function monthlyMeans(s: DailySeries): number[] {
  const sums = new Map<string, number>()
  for (let i = 0; i < s.dates.length; i++) {
    const key = s.dates[i].slice(0, 7)
    sums.set(key, (sums.get(key) ?? 0) + s.precip[i] - s.et0[i])
  }
  const byMonth: number[][] = Array.from({ length: 12 }, () => [])
  for (const [key, v] of sums) byMonth[Number(key.slice(5, 7)) - 1].push(v)
  return byMonth.map((v) => Math.round(mean(v)))
}

function riskLabel(monthly: number[]): string {
  const dry = monthly.map((v) => v < -30)
  let best: [number, number] | null = null
  let start = -1
  for (let m = 0; m <= 12; m++) {
    if (m < 12 && dry[m]) {
      if (start < 0) start = m
    } else if (start >= 0) {
      const sum = monthly.slice(start, m).reduce((a, b) => a + b, 0)
      const bestSum = best ? monthly.slice(best[0], best[1]).reduce((a, b) => a + b, 0) : 0
      if (!best || sum < bestSum) best = [start, m]
      start = -1
    }
  }
  if (!best) return "brak wyraźnie suchych miesięcy"
  const [a, b] = best
  return b - a === 1 ? MONTHS_PL[a] : `${MONTHS_PL[a]}–${MONTHS_PL[b - 1]}`
}

export function computeBalance(s: DailySeries, analysisDate: string, windowDays: number, years: number): BalanceResult {
  const year = Number(analysisDate.slice(0, 4))
  const current = windowFor(s, analysisDate, windowDays, year)
  const previous = Array.from({ length: years }, (_, k) => windowFor(s, shiftYear(analysisDate, -(k + 1)), windowDays, year - k - 1))
    .filter((w) => w.complete)
    .reverse()
  const balances = previous.map((w) => w.balance)
  const normal = {
    precip: mean(previous.map((w) => w.precip)),
    et0: mean(previous.map((w) => w.et0)),
    balance: mean(balances),
    tmaxMean: mean(previous.map((w) => w.tmaxMean).filter(Number.isFinite)),
    balanceSd: sd(balances),
  }
  const z = normal.balanceSd > 0 ? (current.balance - normal.balance) / normal.balanceSd : 0
  const last7 = windowFor(s, analysisDate, 7, year)
  const monthly = monthlyMeans(s)
  return {
    windowDays,
    current,
    previous,
    normal,
    z,
    precipDeficitMm: Math.round(current.precip - normal.precip),
    precipDeficitPct: normal.precip > 0 ? Math.round((current.precip / normal.precip - 1) * 100) : 0,
    tmaxAnomaly: Number.isFinite(current.tmaxMean) ? Math.round((current.tmaxMean - normal.tmaxMean) * 10) / 10 : 0,
    last7: { precip: last7.precip, et0: last7.et0 },
    riskMonths: riskLabel(monthly),
    monthlyMeanBalance: monthly,
  }
}
