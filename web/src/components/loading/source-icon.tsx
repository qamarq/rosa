import type { SourceKey } from "@/lib/types"

export function SourceIcon({ source }: { source: SourceKey }) {
  switch (source) {
    case "pogoda":
      return (
        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
          <ellipse cx="13" cy="14" rx="10" ry="6.5" fill="#E2EEF0" />
          <circle cx="10" cy="11" r="5" fill="#E2EEF0" />
          <circle cx="16" cy="10" r="5.5" fill="#E2EEF0" />
          <path d="M9 20l-1 3M14 20l-1 3" stroke="#3FA3B0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "satelita":
      return (
        <svg width="24" height="24" viewBox="0 0 56 36" aria-hidden="true">
          <rect x="20" y="8" width="16" height="20" rx="5" fill="#5B4D3E" />
          <rect x="0" y="12" width="18" height="12" rx="3" fill="#3FA3B0" />
          <rect x="38" y="12" width="18" height="12" rx="3" fill="#3FA3B0" />
        </svg>
      )
    case "gleba":
      return (
        <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="4" y="6" width="24" height="6" rx="3" fill="#7DAF46" />
          <rect x="4" y="12" width="24" height="7" rx="2" fill="#9C6E45" />
          <rect x="4" y="19" width="24" height="7" rx="3" fill="#D8B37E" />
        </svg>
      )
    case "teren":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B4D3E" strokeWidth="1.8" aria-hidden="true">
          <path d="M2 16 L8 10 L13 13 L22 6 M2 20 L8 14 L13 17 L22 10 M8 10 V14 M13 13 V17" />
        </svg>
      )
    case "hydrologia":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3FA3B0" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6c4 0 4 4 8 4s4-4 8-4M3 12c4 0 4 4 8 4s4-4 8-4" />
        </svg>
      )
  }
}
