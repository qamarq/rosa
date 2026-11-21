import type { CropId } from "@/lib/types"

export function CropIcon({ crop, className }: { crop: CropId; className?: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className={className}>
      {ICONS[crop]}
    </svg>
  )
}

const ICONS: Record<CropId, React.ReactNode> = {
  pszenica: (
    <>
      <path d="M18 34 V10" stroke="#B88A2E" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="18" cy="7" rx="2.6" ry="4.4" fill="#E5B550" />
      <ellipse cx="14" cy="13" rx="2.8" ry="4.6" transform="rotate(-28 14 13)" fill="#E5B550" />
      <ellipse cx="22" cy="13" rx="2.8" ry="4.6" transform="rotate(28 22 13)" fill="#DDA944" />
      <ellipse cx="14" cy="20" rx="2.8" ry="4.6" transform="rotate(-28 14 20)" fill="#E5B550" />
      <ellipse cx="22" cy="20" rx="2.8" ry="4.6" transform="rotate(28 22 20)" fill="#DDA944" />
      <ellipse cx="13" cy="12" rx="1" ry="2" fill="#FFFFFF" opacity=".55" />
    </>
  ),
  kukurydza: (
    <>
      <ellipse cx="18" cy="16" rx="6.5" ry="12" fill="#F0C24B" />
      <path d="M14 9 h8 M13 14 h10 M13 19 h10 M14 24 h8" stroke="#D9A52E" strokeWidth="1.4" />
      <ellipse cx="15.5" cy="11" rx="1.6" ry="4" fill="#FFFFFF" opacity=".5" />
      <path d="M9 33 C 7 23, 10 14, 15 9 C 13 17, 14 25, 17 33 Z" fill="#7FAE45" />
      <path d="M27 33 C 29 23, 26 14, 21 9 C 23 17, 22 25, 19 33 Z" fill="#6E9B3A" />
    </>
  ),
  rzepak: (
    <>
      <path d="M18 34 V16 M18 22 L11 16 M18 20 L25 13" stroke="#6E9B3A" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18" cy="10" r="5" fill="#F2CF3B" />
      <circle cx="10" cy="14" r="4" fill="#EBC22E" />
      <circle cx="26" cy="11" r="4" fill="#F2CF3B" />
      <circle cx="18" cy="10" r="1.8" fill="#D9A52E" />
      <circle cx="16" cy="8" r="1.3" fill="#FFFFFF" opacity=".6" />
    </>
  ),
  ziemniaki: (
    <>
      <ellipse cx="14" cy="20" rx="10" ry="8" fill="#C99A5E" />
      <ellipse cx="24" cy="23" rx="8" ry="6.5" fill="#B5844A" />
      <circle cx="11" cy="18" r="1.2" fill="#8A6234" />
      <circle cx="17" cy="23" r="1.2" fill="#8A6234" />
      <circle cx="26" cy="22" r="1.1" fill="#7A5228" />
      <ellipse cx="11" cy="16" rx="3" ry="1.6" fill="#FFFFFF" opacity=".45" />
    </>
  ),
  buraki: (
    <>
      <path d="M18 14 C 12 2, 6 6, 8 10 C 10 13, 15 13, 18 14 Z" fill="#7FAE45" />
      <path d="M18 14 C 22 2, 30 4, 28 9 C 26 12, 21 13, 18 14 Z" fill="#6E9B3A" />
      <path d="M18 34 C 14 30, 9 25, 9 20 A 9 7 0 0 1 27 20 C 27 25, 22 30, 18 34 Z" fill="#A8344E" />
      <ellipse cx="14" cy="19" rx="2.6" ry="1.6" fill="#FFFFFF" opacity=".4" />
    </>
  ),
  laka: (
    <>
      <ellipse cx="18" cy="31" rx="15" ry="3.5" fill="#9DB25C" />
      <path
        d="M8 31 C 7 24, 5 20, 3 18 M12 31 C 12 22, 14 18, 16 15 M20 31 C 20 24, 22 20, 25 18 M27 31 C 28 25, 30 22, 33 20"
        stroke="#6E9B3A"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="12" r="3.5" fill="#F3EFE3" />
      <circle cx="16" cy="12" r="1.5" fill="#E2B83E" />
    </>
  ),
}
