import type { Cause, CropId, RecommendationGroup } from "@/lib/types"
import { Leaf, Sprout, Wheat } from "lucide-react"

export function RosaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 3 C 12 10, 6 16, 6 22 A 11 11 0 0 0 28 22 C 28 16, 22 10, 17 3 Z" fill="#0E6E73" />
      <path d="M11.5 22 A 5.5 5.5 0 0 0 17 27.5" stroke="#9FDCE6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function CropIcon({ crop }: { crop: CropId }) {
  if (crop === "kukurydza") {
    return (
      <svg width="26" height="26" viewBox="0 0 36 36" aria-hidden="true">
        <ellipse cx="18" cy="16" rx="6.5" ry="12" fill="#F0C24B" />
        <path d="M14 9 h8 M13 14 h10 M13 19 h10 M14 24 h8" stroke="#D9A52E" strokeWidth="1.4" />
        <path d="M9 33 C 7 23, 10 14, 15 9 C 13 17, 14 25, 17 33 Z" fill="#7FAE45" />
        <path d="M27 33 C 29 23, 26 14, 21 9 C 23 17, 22 25, 19 33 Z" fill="#6E9B3A" />
      </svg>
    )
  }
  const Icon = crop === "pszenica" || crop === "rzepak" ? Wheat : crop === "laka" ? Leaf : Sprout
  return (
    <span className="flex size-[26px] items-center justify-center" aria-hidden="true">
      <Icon className="size-5 text-[#6E9B3A]" strokeWidth={2.4} />
    </span>
  )
}

export function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B4D3E" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A2118" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A2118" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

export function LayersIcon({ color = "#FFFDF8" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  )
}

export function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2118" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A2118" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B4D3E" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function ArrowDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="7" fill="#F4A93A" />
      <path d="M13 1.5v3M13 21.5v3M1.5 13h3M21.5 13h3M4.8 4.8l2.1 2.1M19.1 19.1l2.1 2.1M4.8 21.2l2.1-2.1M19.1 6.9l2.1-2.1" stroke="#E08A22" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2.2" fill="#FFE1A6" />
    </svg>
  )
}

export function RainDeficitIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <ellipse cx="13" cy="13" rx="10" ry="6.5" fill="#E2EEF0" />
      <circle cx="10" cy="10" r="5" fill="#E2EEF0" />
      <circle cx="16" cy="9" r="5.5" fill="#E2EEF0" />
      <path d="M9 20l-1 3M14 20l-1 3" stroke="#B9D3D8" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 21h6" stroke="#A8432A" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function DropGauge({ fill }: { fill: string }) {
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true" className="absolute inset-0">
      <path d="M66 6 C 50 32, 20 58, 20 84 A 46 46 0 0 0 112 84 C 112 58, 82 32, 66 6 Z" fill={fill} />
      <ellipse cx="46" cy="66" rx="8" ry="14" fill="#FFFFFF" opacity=".5" />
      <path d="M30 94 l14 -6 l8 8 l12 -6 M70 104 l10 -8 l14 4" stroke="#B8862B" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
    </svg>
  )
}

export function CauseIcon({ kind }: { kind: Cause["kind"] }) {
  switch (kind) {
    case "opady":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#F6DCCB" />
          <ellipse cx="26" cy="24" rx="15" ry="9" fill="#FFFFFF" />
          <circle cx="21" cy="19" r="7" fill="#FFFFFF" />
          <circle cx="30" cy="17" r="8" fill="#FFFFFF" />
          <path d="M20 36l-1.5 4M27 36l-1.5 4" stroke="#7CC6D6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 39h10" stroke="#A8432A" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case "gleba":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#EFE1C2" />
          <rect x="9" y="12" width="34" height="7" rx="3.5" fill="#8DB54A" />
          <rect x="9" y="19" width="34" height="9" rx="2" fill="#B07A4E" />
          <rect x="9" y="28" width="34" height="12" rx="4" fill="#E4C38F" />
          <circle cx="16" cy="33" r="1.6" fill="#FFFFFF" />
          <circle cx="24" cy="36" r="1.6" fill="#FFFFFF" />
          <circle cx="33" cy="32" r="1.6" fill="#FFFFFF" />
          <path d="M26 30 v10" stroke="#7CC6D6" strokeWidth="2" strokeDasharray="2 3" />
        </svg>
      )
    case "spadek":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#D7E9E5" />
          <path d="M8 18 L44 34 L44 42 L8 42 Z" fill="#B9834F" />
          <path d="M8 18 L44 34" stroke="#7DAF46" strokeWidth="4" strokeLinecap="round" />
          <circle cx="16" cy="18" r="3" fill="#7CC6D6" />
          <circle cx="25" cy="22" r="2.5" fill="#7CC6D6" />
          <circle cx="34" cy="26" r="2" fill="#7CC6D6" />
          <path d="M36 14 l6 3 -6 3" stroke="#0E6E73" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case "upal":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#F8E2C4" />
          <circle cx="26" cy="26" r="9" fill="#F4A93A" />
          <path d="M26 9v4M26 39v4M9 26h4M39 26h4M14 14l3 3M35 35l3 3M14 38l3-3M35 17l3-3" stroke="#E08A22" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )
    case "rosliny":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#EFE8CF" />
          <path d="M26 42V25M26 25c0-6 4-10 11-10 0 6-4 10-11 10zM26 31c0-5-4-8-10-8 0 5 4 8 10 8z" stroke="#7A6B2E" strokeWidth="2.6" fill="#C9B458" strokeLinejoin="round" />
          <circle cx="40" cy="38" r="6" fill="#0E6E73" />
          <path d="M37.5 38h5M40 35.5v5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" transform="rotate(45 40 38)" />
        </svg>
      )
    case "uprawa":
      return (
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="flex-none">
          <rect width="52" height="52" rx="16" fill="#E3ECCF" />
          <path d="M26 42V24M26 24c0-6 4-10 11-10 0 6-4 10-11 10zM26 30c0-5-4-8-10-8 0 5 4 8 10 8z" stroke="#5F6B2E" strokeWidth="2.6" fill="#8DB54A" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function GroupIcon({ group }: { group: RecommendationGroup }) {
  if (group === "woda") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 C 9 8, 5 11, 5 15 A 7 7 0 0 0 19 15 C 19 11, 15 8, 12 3 Z" fill="#FFFFFF" />
      </svg>
    )
  }
  if (group === "gleba") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 21v-8M12 13c-3-3-6-4-9-3M12 13c3-3 6-4 9-3M12 13V5" />
    </svg>
  )
}
