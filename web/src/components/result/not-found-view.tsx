"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { RosaLogo } from "./icons"

function parcelFromId(id: string | string[] | undefined): string | null {
  if (typeof id !== "string") return null
  try {
    return decodeURIComponent(id).split("~")[0] || null
  } catch {
    return null
  }
}

export function NotFoundView({ demoHref }: { demoHref: string }) {
  const params = useParams<{ id?: string }>()
  const parcel = parcelFromId(params?.id)
  const fixHref = parcel ? `/?parcel=${encodeURIComponent(parcel)}` : "/"

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 bg-[#F1E5D2] px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-foreground no-underline hover:text-foreground">
        <RosaLogo />
        <span className="font-heading text-2xl font-extrabold tracking-[.02em]">ROSA</span>
      </Link>
      <article className="rosa-clay flex w-full max-w-[420px] flex-col gap-3.5 rounded-3xl bg-paper p-5">
        <span className="self-start rounded-[10px] bg-[#F6E0D6] px-2.5 py-1 text-[13px] font-extrabold text-[#7A2E18]">
          Działka nie znaleziona
        </span>
        <svg width="100%" height="120" viewBox="0 0 220 120" aria-hidden="true">
          <ellipse cx="110" cy="108" rx="90" ry="9" fill="#E3CFA8" />
          <polygon points="40,90 110,62 180,90 110,112" fill="#D9C38E" />
          <polygon points="70,90 110,74 150,90 110,104" fill="none" stroke="#B9834F" strokeWidth="2" strokeDasharray="5 5" />
          <circle cx="124" cy="44" r="24" fill="#E9F3F5" stroke="#5B4D3E" strokeWidth="6" />
          <circle cx="116" cy="36" r="6" fill="#FFFFFF" />
          <path d="M141 61 L160 80" stroke="#5B4D3E" strokeWidth="9" strokeLinecap="round" />
          <text x="124" y="52" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontSize="22" fontWeight="800" fill="#5B4D3E">
            ?
          </text>
        </svg>
        <h1 className="m-0 text-[19px] font-extrabold">Nie znaleźliśmy tej działki</h1>
        <p className="m-0 text-[15px] leading-[1.45] text-[#3A2F24]">
          {parcel ? (
            <>
              W ewidencji GUGiK nie ma działki <strong className="tabular-nums">{parcel}</strong>. Sprawdź ostatnie cyfry albo wpisz numer jeszcze
              raz.
            </>
          ) : (
            <>Nie mamy wyniku pod tym adresem. Sprawdź numer działki albo zacznij od nowa.</>
          )}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Link
            href={fixHref}
            className="rosa-btn flex h-[52px] items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-white no-underline hover:text-white"
          >
            Popraw numer
          </Link>
          <Link
            href={demoHref}
            className="rosa-btn flex h-[52px] items-center justify-center rounded-2xl border-2 border-border bg-paper text-base font-bold text-foreground no-underline hover:text-foreground"
          >
            Zobacz przykładową działkę
          </Link>
        </div>
      </article>
    </main>
  )
}
