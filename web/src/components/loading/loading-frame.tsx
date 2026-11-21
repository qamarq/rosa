"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLiteMode } from "@/components/lite-mode"

export function LoadingFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden bg-sand">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[260px] -right-[220px] -z-10 size-[1000px] rounded-full bg-[radial-gradient(circle,rgba(255,201,120,.60)_0%,rgba(255,201,120,0)_62%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[210px] bg-sand-deep" />
      <header className="flex items-center justify-between gap-4 px-4 pt-4 md:px-[72px] md:pt-7">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl text-foreground no-underline">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <path d="M17 3 C 12 10, 6 16, 6 22 A 11 11 0 0 0 28 22 C 28 16, 22 10, 17 3 Z" fill="#0E6E73" />
            <path d="M11.5 22 A 5.5 5.5 0 0 0 17 27.5" stroke="#9FDCE6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <ellipse cx="13" cy="15" rx="2.2" ry="3.5" fill="#FFFFFF" opacity=".45" />
          </svg>
          <span className="font-heading text-[26px] font-extrabold tracking-[0.02em] md:text-[30px]">ROSA</span>
        </Link>
        <LiteToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6 md:px-[72px] md:py-8">
        {children}
      </main>
    </div>
  )
}

export function LiteToggle() {
  const { lite, toggle } = useLiteMode()
  return (
    <button
      type="button"
      aria-pressed={lite}
      onClick={toggle}
      className="rosa-btn flex h-11 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-border bg-paper pr-4 pl-3 text-[15px] font-semibold text-foreground md:h-12 md:pr-[18px] md:text-base"
    >
      <span
        aria-hidden="true"
        className={cn("relative inline-block h-6 w-10 rounded-xl transition-colors", lite ? "bg-primary" : "bg-[#D9C9AE]")}
      >
        <span
          className={cn(
            "absolute top-[3px] size-[18px] rounded-full bg-white transition-[left]",
            lite ? "left-[19px]" : "left-[3px]",
          )}
        />
      </span>
      Tryb lekki
    </button>
  )
}
