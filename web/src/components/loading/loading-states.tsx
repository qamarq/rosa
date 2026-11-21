"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { dateRange, formatDatePl } from "@/lib/validation"
import type { ClientResult } from "@/lib/api-client"
import { TIMING } from "./story-config"

export type LoadInput = { parcel: string; crop: string; date: string }

export type LoadError =
  | { kind: "not_found"; parcelId: string }
  | { kind: "invalid_parcel" }
  | { kind: "date_out_of_range"; min?: string }
  | { kind: "unavailable"; reason: "network" | "upstream" | "timeout" }

export function toLoadError(result: Extract<ClientResult, { ok: false }>, parcelId: string): LoadError {
  const { error } = result
  switch (error.code) {
    case "parcel_not_found":
      return { kind: "not_found", parcelId: error.parcelId ?? parcelId }
    case "invalid_parcel_id":
      return { kind: "invalid_parcel" }
    case "date_out_of_range":
      return { kind: "date_out_of_range", min: error.min }
    case "network":
      return { kind: "unavailable", reason: "network" }
    default:
      return { kind: "unavailable", reason: "upstream" }
  }
}

export function startHref(input: Partial<LoadInput>, extra?: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...input, ...extra })) if (value) params.set(key, value)
  const query = params.toString()
  return query ? `/?${query}` : "/"
}

export function analysisHref(input: LoadInput): string {
  return `/analiza?${new URLSearchParams({ parcel: input.parcel, crop: input.crop, date: input.date })}`
}

const card = "rosa-clay flex w-full max-w-[440px] flex-col gap-3.5 rounded-3xl bg-card p-5"
const badge = "self-start rounded-[10px] px-2.5 py-1 text-[13px] font-extrabold"
const primary = "rosa-btn h-[52px] w-full rounded-2xl text-base font-extrabold"
const outline = "rosa-btn h-[52px] w-full rounded-2xl border-2 border-border bg-paper text-base font-bold text-foreground hover:bg-paper"

export function LoadErrorState({
  error,
  input,
  onRetry,
}: {
  error: LoadError
  input: LoadInput
  onRetry: () => void
}) {
  switch (error.kind) {
    case "not_found":
      return <NotFoundState parcelId={error.parcelId || input.parcel} input={input} />
    case "invalid_parcel":
      return <InvalidParcelState input={input} />
    case "date_out_of_range":
      return <DateOutOfRangeState input={input} min={error.min} />
    case "unavailable":
      return <UnavailableState reason={error.reason} onRetry={onRetry} />
  }
}

function NotFoundState({ parcelId, input }: { parcelId: string; input: LoadInput }) {
  return (
    <article className={card} aria-labelledby="state-title">
      <span className={cn(badge, "bg-[#F6E0D6] text-[#7A2E18]")}>Działka nie znaleziona</span>
      <svg width="100%" height="120" viewBox="0 0 220 120" aria-hidden="true">
        <ellipse cx="110" cy="108" rx="90" ry="9" fill="#E3CFA8" />
        <polygon points="40,90 110,62 180,90 110,112" fill="#D9C38E" />
        <polygon points="70,90 110,74 150,90 110,104" fill="none" stroke="#B9834F" strokeWidth="2" strokeDasharray="5 5" />
        <circle cx="124" cy="44" r="24" fill="#E9F3F5" stroke="#5B4D3E" strokeWidth="6" />
        <circle cx="116" cy="36" r="6" fill="#FFFFFF" />
        <path d="M141 61 L160 80" stroke="#5B4D3E" strokeWidth="9" strokeLinecap="round" />
        <text
          x="124"
          y="52"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#5B4D3E"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          ?
        </text>
      </svg>
      <h1 id="state-title" className="m-0 text-[19px] font-extrabold">
        Nie znaleźliśmy tej działki
      </h1>
      <p className="m-0 text-[15px] leading-[1.45] text-[#3A2F24]">
        W ewidencji GUGiK nie ma działki <strong className="break-all tabular-nums">{parcelId}</strong>. Sprawdź ostatnie
        cyfry albo wskaż pole na mapie.
      </p>
      <div className="mt-auto flex flex-col gap-2">
        <Button nativeButton={false} className={primary} render={<Link href={startHref(input)} />}>
          Popraw numer
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          className={outline}
          render={<Link href={startHref(input, { mapa: "1" })} />}
        >
          Wskaż na mapie
        </Button>
      </div>
    </article>
  )
}

function InvalidParcelState({ input }: { input: LoadInput }) {
  return (
    <article className={card} aria-labelledby="state-title">
      <span className={cn(badge, "bg-[#F6E0D6] text-[#7A2E18]")}>Zły numer działki</span>
      <h1 id="state-title" className="m-0 text-[19px] font-extrabold">
        Numer działki
      </h1>
      <p className="m-0 flex h-14 items-center rounded-2xl border-2 border-destructive bg-white px-3.5 text-lg font-semibold break-all tabular-nums">
        {input.parcel}
      </p>
      <p className="m-0 flex gap-2 text-[15px] leading-[1.45] text-[#7A2E18]">
        <span
          aria-hidden="true"
          className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-destructive text-[13px] font-extrabold text-white"
        >
          !
        </span>
        <span>
          To nie wygląda na numer działki. Powinien mieć podkreślnik i dwie kropki, np. <strong>302604_5.0017.5196</strong>.
        </span>
      </p>
      <div className="mt-auto flex flex-col gap-2">
        <Button nativeButton={false} className={primary} render={<Link href={startHref(input)} />}>
          Popraw numer
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          className={outline}
          render={<Link href={startHref(input, { mapa: "1" })} />}
        >
          Wskaż pole na mapie
        </Button>
      </div>
    </article>
  )
}

function yearsBefore(iso: string, years: number): string {
  const [y, m, d] = iso.split("-")
  const day = m === "02" && d === "29" ? "28" : d
  return `${Number(y) - years}-${m}-${day}`
}

function DateOutOfRangeState({ input, min }: { input: LoadInput; min?: string }) {
  const range = dateRange()
  const from = min ?? range.min
  const picks = [
    { label: "Dziś", date: range.max },
    { label: "Rok temu", date: yearsBefore(range.max, 1) },
    { label: formatDatePl(from), date: from },
  ]
  return (
    <article className={card} aria-labelledby="state-title">
      <span className={cn(badge, "bg-[#FBF1DA] text-[#5A3E0A]")}>Data spoza zakresu</span>
      <h1 id="state-title" className="m-0 text-[19px] font-extrabold">
        Dzień analizy
      </h1>
      {input.date && (
        <p className="m-0 flex h-14 items-center rounded-2xl border-2 border-destructive bg-white px-3.5 text-lg font-semibold tabular-nums">
          {/^\d{4}-\d{2}-\d{2}$/.test(input.date) ? formatDatePl(input.date) : input.date}
        </p>
      )}
      <p className="m-0 text-[15px] leading-[1.45] text-[#7A2E18]">
        Mamy dane z ostatnich 10 lat: <strong>od {formatDatePl(from)} do dziś</strong>. Wybierz późniejszy dzień.
      </p>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick, i) => (
          <Button
            key={pick.label}
            nativeButton={false}
            variant={i === 0 ? "secondary" : "outline"}
            className={cn(
              "rosa-btn h-11 rounded-[14px] border-2 border-secondary px-3.5 text-[15px] font-bold",
              i === 0 ? "bg-secondary text-secondary-foreground" : "bg-paper text-foreground hover:bg-paper",
            )}
            render={<Link href={analysisHref({ ...input, date: pick.date })} replace />}
          >
            {pick.label}
          </Button>
        ))}
      </div>
      <p className="m-0 mt-auto text-sm leading-[1.45] text-muted-foreground">
        Albo{" "}
        <Link href={startHref(input)} className="font-bold text-primary underline-offset-4 hover:underline">
          wróć i wybierz dzień w kalendarzu
        </Link>
        .
      </p>
    </article>
  )
}

const UNAVAILABLE_COPY: Record<"network" | "upstream" | "timeout", string> = {
  network: "Nie możemy połączyć się z serwerem ROSA. Sprawdź internet — Twoje dane zostają w formularzu.",
  upstream: "Źródła danych chwilowo nie odpowiadają. Bez nich nie policzymy uczciwego wyniku.",
  timeout: "Źródła odpowiadają dłużej niż zwykle. Przerwaliśmy czekanie, żeby nie trzymać Cię w miejscu.",
}

function UnavailableState({ reason, onRetry }: { reason: "network" | "upstream" | "timeout"; onRetry: () => void }) {
  const [left, setLeft] = useState<number>(TIMING.autoRetrySeconds)

  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (left === 0) onRetry()
  }, [left, onRetry])

  const rows = ["Pogoda (10 lat)", "Satelita (Sentinel-2)", "Gleba, teren, cieki"]

  return (
    <article className={card} aria-labelledby="state-title">
      <span className={cn(badge, "bg-[#ECE8E1] text-[#3F3A33]")}>Źródło nie odpowiada</span>
      <h1 id="state-title" className="m-0 text-[19px] font-extrabold">
        Nie udało się pobrać danych
      </h1>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li
            key={row}
            className="flex h-[42px] items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#8C8478] bg-[#ECE8E1] px-3 text-sm font-bold text-[#4A453E]"
          >
            {row}
            <span>{reason === "network" ? "brak połączenia" : "brak odpowiedzi"}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[15px] leading-[1.45]">{UNAVAILABLE_COPY[reason]}</p>
      <div className="mt-auto flex flex-col gap-2">
        <Button type="button" className={primary} onClick={onRetry}>
          Spróbuj ponownie
        </Button>
        <span className="text-center text-[13px] text-muted-foreground" aria-live="off">
          Ponawiamy też sami co 30 s
          <span className="tabular-nums"> · za {left} s</span>
        </span>
      </div>
    </article>
  )
}
