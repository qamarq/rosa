"use client"

import Link from "next/link"
import { useLiteMode } from "@/components/lite-mode"
import { formatDatePl } from "@/lib/validation"
import type { Analysis } from "@/lib/types"
import { cn } from "@/lib/utils"
import { placeLine } from "./format"
import { CalendarIcon, CropIcon, DownloadIcon, RosaLogo } from "./icons"

export function LiteToggle({ className }: { className?: string }) {
  const { lite, toggle } = useLiteMode()
  return (
    <button
      type="button"
      aria-pressed={lite}
      onClick={toggle}
      className={cn(
        "rosa-btn flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-border bg-paper pr-4 pl-2.5 text-base font-bold text-foreground",
        className,
      )}
    >
      <LiteSwitchVisual on={lite} />
      Tryb lekki
    </button>
  )
}

export function LiteSwitchVisual({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block h-6 w-10 flex-none rounded-xl transition-colors", on ? "bg-primary" : "bg-[#D9C9AE]")}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[18px] rounded-full bg-white transition-[left] duration-300 ease-spring",
          on ? "left-[19px]" : "left-[3px]",
        )}
      />
    </span>
  )
}

export function ResultHeader({ analysis }: { analysis: Analysis }) {
  const date = formatDatePl(analysis.request.date)
  return (
    <header className="no-print flex h-[76px] flex-none items-center gap-3.5 border-b border-input bg-[#FBF6EC] px-6 2xl:gap-[18px]">
      <Link href="/" className="flex flex-none items-center gap-2 text-foreground no-underline hover:text-foreground">
        <RosaLogo />
        <span className="font-heading text-2xl font-extrabold tracking-[.02em]">ROSA</span>
      </Link>
      <span aria-hidden="true" className="h-9 w-px flex-none bg-border" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-extrabold tabular-nums">Działka {analysis.parcel.id}</span>
        <span className="truncate text-sm text-ink-soft">
          {placeLine(analysis.parcel)}
          <span className="xl:hidden">
            {" "}
            · {analysis.cropLabel.toLowerCase()} · {date}
          </span>
        </span>
      </div>
      <span className="hidden h-10 flex-none items-center gap-1.5 rounded-[14px] bg-background pr-3.5 pl-2 text-[15px] font-bold xl:flex">
        <CropIcon crop={analysis.request.crop} />
        {analysis.cropLabel}
      </span>
      <span className="hidden h-10 flex-none items-center gap-2 rounded-[14px] bg-background px-3.5 text-[15px] font-bold tabular-nums xl:flex">
        <CalendarIcon />
        {date}
      </span>
      <span className="flex-1" />
      <Link
        href="/"
        className="rosa-btn flex h-12 flex-none items-center rounded-2xl border-2 border-border bg-paper px-[18px] text-base font-bold text-foreground no-underline hover:text-foreground"
      >
        Zmień działkę
      </Link>
      <LiteToggle className="flex-none" />
      <Link
        href={`/raport/${analysis.id}`}
        className="rosa-btn rosa-claybtn flex h-12 flex-none items-center gap-2.5 rounded-2xl bg-primary px-5 text-base font-extrabold text-white no-underline hover:text-white"
      >
        <DownloadIcon />
        Raport PDF
      </Link>
    </header>
  )
}
