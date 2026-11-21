"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLiteMode } from "@/components/lite-mode"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"

export function RosaMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d="M17 3 C 12 10, 6 16, 6 22 A 11 11 0 0 0 28 22 C 28 16, 22 10, 17 3 Z" fill="#0E6E73" />
      <path d="M11.5 22 A 5.5 5.5 0 0 0 17 27.5" stroke="#9FDCE6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="13" cy="15" rx="2.2" ry="3.5" fill="#FFFFFF" opacity=".45" />
    </svg>
  )
}

export function RosaLogo({ size = "lg", className }: { size?: "lg" | "md"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="ROSA, strona startowa"
      className={cn(
        "flex items-center text-foreground no-underline hover:text-foreground",
        size === "lg" ? "gap-2.5" : "gap-2",
        className
      )}
    >
      <RosaMark size={size === "lg" ? 34 : 30} className={size === "lg" ? "max-sm:size-[30px]" : undefined} />
      <span
        className={cn(
          "font-heading font-extrabold tracking-[.02em]",
          size === "lg" ? "text-[26px] sm:text-[30px]" : "text-[24px]"
        )}
      >
        ROSA
      </span>
    </Link>
  )
}

export function LiteModeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lite, auto, toggle } = useLiteMode()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={lite}
      title={auto ? "Włączony automatycznie: wolne łącze lub ograniczony ruch" : undefined}
      onClick={toggle}
      className={cn(
        "rosa-btn flex h-12 shrink-0 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-border bg-card pr-[18px] pl-3 text-base font-semibold text-foreground",
        compact && "h-11 gap-2 pr-3.5 pl-2.5 text-[15px]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-block h-6 w-10 shrink-0 rounded-xl transition-colors duration-200",
          lite ? "bg-primary" : "bg-[#D9C9AE]"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white transition-transform duration-300 ease-spring",
            lite && "translate-x-4"
          )}
        />
      </span>
      Tryb lekki
    </button>
  )
}

const NAV_LINK =
  "cursor-pointer rounded-[14px] px-4 py-3 text-base font-semibold text-foreground no-underline transition-colors hover:bg-card/70 hover:text-foreground aria-expanded:bg-card/70"

const STEPS = [
  { title: "Wpisz numer działki", text: "Wybierz, co rośnie na polu i na jaki dzień ma być ocena." },
  { title: "Zbieramy otwarte dane", text: "10 lat pogody, zdjęcia satelitarne, gleba, teren, rowy, rzeki i wody gruntowe." },
  { title: "Dostajesz wynik", text: "Ile wody jest w glebie, dlaczego jej brakuje i jak ją zatrzymać na polu." },
]

const SOURCES = [
  { name: "IMGW-PIB", what: "opady i temperatury z 10 lat i z ostatnich dni, stany rzek z wodowskazów" },
  { name: "Copernicus Sentinel-2", what: "kondycja roślin ze zdjęć satelitarnych" },
  { name: "IUNG-PIB", what: "gleba i podatność na suszę" },
  { name: "PIG-PIB", what: "głębokość wód gruntowych" },
  { name: "GUGiK (EGiB, NMT, BDOT10k)", what: "granice działek, teren, rowy i cieki" },
  { name: "Open-Meteo", what: "zapasowo: dni, dla których nie ma jeszcze pomiarów IMGW" },
]

function HowItWorks() {
  return (
    <Popover>
      <PopoverTrigger className={NAV_LINK}>Jak to działa</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] gap-3 rounded-[20px] p-[18px] shadow-[0_24px_48px_-24px_rgba(110,70,30,0.4)] ring-border">
        <PopoverHeader>
          <PopoverTitle className="font-heading text-xl font-extrabold">Jak to działa</PopoverTitle>
          <PopoverDescription className="text-[15px]">Trzy kroki, bez logowania.</PopoverDescription>
        </PopoverHeader>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground"
              >
                {i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[15px] font-bold">{step.title}</strong>
                <span className="text-sm leading-[1.45] text-muted-foreground">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  )
}

function DataSources() {
  return (
    <Popover>
      <PopoverTrigger className={NAV_LINK}>Źródła danych</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] gap-3 rounded-[20px] p-[18px] shadow-[0_24px_48px_-24px_rgba(110,70,30,0.4)] ring-border">
        <PopoverHeader>
          <PopoverTitle className="font-heading text-xl font-extrabold">Źródła danych</PopoverTitle>
          <PopoverDescription className="text-[15px]">Korzystamy tylko z otwartych danych publicznych.</PopoverDescription>
        </PopoverHeader>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {SOURCES.map((s) => (
            <li key={s.name} className="flex flex-col rounded-xl bg-muted px-3 py-2">
              <strong className="text-[15px] font-bold">{s.name}</strong>
              <span className="text-sm text-muted-foreground">{s.what}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("flex items-center justify-between gap-4", className)}>
      <RosaLogo />
      <nav aria-label="Główna" className="flex items-center gap-1.5">
        <div className="hidden items-center gap-1.5 md:flex">
          <HowItWorks />
          <DataSources />
        </div>
        <LiteModeToggle className="max-sm:h-11 max-sm:gap-2 max-sm:pr-3.5 max-sm:pl-2.5 max-sm:text-[15px]" />
      </nav>
    </header>
  )
}
