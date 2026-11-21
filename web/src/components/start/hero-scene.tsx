import Link from "next/link"
import { cn } from "@/lib/utils"
import { Diorama } from "@/components/diorama/diorama"
import styles from "./start.module.css"

const CHIP =
  "rosa-bob flex items-center gap-2.5 rounded-[18px] bg-card py-2.5 pr-4 pl-2.5 text-[15px] font-bold whitespace-nowrap xl:absolute"

function WeatherIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#E9F3F5" />
      <circle cx="12" cy="15" r="6" fill="#E9F3F5" />
      <circle cx="19" cy="13" r="7" fill="#E9F3F5" />
      <ellipse cx="16" cy="24" rx="10" ry="2.5" fill="#BFD9DE" />
      <path d="M11 27 l-1 3 M16 27 l-1 3 M21 27 l-1 3" stroke="#3FA3B0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SatelliteIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="12" y="11" width="8" height="10" rx="3" fill="#5B4D3E" />
      <rect x="2" y="13" width="9" height="6" rx="2" fill="#3FA3B0" />
      <rect x="21" y="13" width="9" height="6" rx="2" fill="#3FA3B0" />
      <circle cx="16" cy="24" r="2.5" fill="#E3A73C" />
      <rect x="13" y="12" width="3" height="4" rx="1.5" fill="#FFFFFF" opacity=".4" />
    </svg>
  )
}

function SoilIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="6" width="24" height="6" rx="3" fill="#7DAF46" />
      <rect x="4" y="12" width="24" height="7" rx="2" fill="#9C6E45" />
      <rect x="4" y="19" width="24" height="7" rx="3" fill="#D8B37E" />
      <circle cx="10" cy="22" r="1.5" fill="#FFFFFF" opacity=".6" />
      <circle cx="20" cy="15" r="1.5" fill="#FFFFFF" opacity=".4" />
    </svg>
  )
}

function DewLeaf({ className }: { className?: string }) {
  return (
    <svg width="250" height="230" viewBox="0 0 250 230" aria-hidden="true" className={className}>
      <ellipse cx="80" cy="222" rx="70" ry="6" fill="#B58A55" opacity=".35" />
      <path d="M18 206 C 54 128, 140 46, 244 18 C 228 110, 150 196, 18 206 Z" fill="#7DAF46" />
      <path d="M18 206 C 54 128, 140 46, 244 18 C 200 60, 120 120, 18 206 Z" fill="#8EC152" opacity=".8" />
      <path d="M28 198 C 96 146, 168 84, 236 26" stroke="#5E8E33" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path
        d="M70 150 l 30 6 M110 112 l 32 6 M150 76 l 28 6 M96 128 l -6 28 M136 94 l -6 26"
        stroke="#5E8E33"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".6"
      />
      <ellipse cx="178" cy="70" rx="22" ry="6" transform="rotate(-38 178 70)" fill="#FFFFFF" opacity=".35" />
      <g className={styles.dew}>
        <circle cx="196" cy="56" r="10" fill="#CFEFF5" opacity=".85" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="192" cy="52" r="3" fill="#FFFFFF" />
      </g>
      <ellipse className={styles.ring} cx="52" cy="222" rx="14" ry="4" fill="none" stroke="#7CC6D6" strokeWidth="2" />
    </svg>
  )
}

export function HeroScene({ demoHref, demoLabel }: { demoHref: string; demoLabel: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative mt-8 pb-6",
        "xl:absolute xl:right-0 xl:bottom-0 xl:mt-0 xl:h-[808px] xl:w-[856px] xl:origin-bottom-right xl:scale-[.82] xl:pb-0 min-[1440px]:scale-100"
      )}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-[55%] bottom-0 bg-sand-deep xl:hidden" />
      <div className="relative mx-auto w-full max-w-[720px] px-2 xl:absolute xl:top-0 xl:left-0 xl:w-[900px] xl:max-w-none xl:px-0">
        <Diorama mode="hero" labels={false} className="w-full" />
      </div>

      <ul
        aria-label="Z czego korzystamy"
        className="relative m-0 flex list-none flex-wrap justify-center gap-2 px-4 pt-4 xl:contents"
      >
        <li className={cn(CHIP, "xl:top-[84px] xl:left-[66px]")}>
          <WeatherIcon />
          10 lat pogody
        </li>
        <li className={cn(CHIP, "[animation-delay:-1.3s] xl:top-[58px] xl:left-[652px]")}>
          <SatelliteIcon />
          Zdjęcia satelitarne
        </li>
        <li className={cn(CHIP, "[animation-delay:-2.6s] xl:top-[378px] xl:left-[706px]")}>
          <SoilIcon />
          Gleba i teren
        </li>
      </ul>

      <DewLeaf className="pointer-events-none absolute right-2 bottom-24 hidden h-auto w-[150px] sm:block xl:top-[528px] xl:left-[588px] xl:right-auto xl:bottom-auto xl:w-[250px]" />

      <div className="relative mx-4 mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[18px] bg-card/92 py-2.5 pr-3 pl-[18px] sm:mx-auto sm:w-fit xl:absolute xl:top-[650px] xl:left-[242px] xl:m-0 xl:flex-nowrap">
        <span className="text-[15px] text-muted-foreground">{demoLabel}</span>
        <Link
          href={demoHref}
          className="rosa-btn inline-flex h-11 items-center rounded-[14px] bg-foreground px-4 text-[15px] font-bold text-card no-underline hover:text-card"
        >
          Zobacz wynik
        </Link>
      </div>
    </div>
  )
}
