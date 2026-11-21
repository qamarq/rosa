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
  "pszenica-jara": (
    <>
      <path d="M18 34 V12" stroke="#B88A2E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 31 C 12 29, 8 25, 7 20 C 12 22, 16 25, 18 29 Z" fill="#7FAE45" />
      <ellipse cx="18" cy="8" rx="2.4" ry="4" fill="#EACB6A" />
      <ellipse cx="14.5" cy="13" rx="2.5" ry="4.2" transform="rotate(-28 14.5 13)" fill="#EACB6A" />
      <ellipse cx="21.5" cy="13" rx="2.5" ry="4.2" transform="rotate(28 21.5 13)" fill="#E0BC55" />
      <ellipse cx="14.5" cy="19.5" rx="2.5" ry="4.2" transform="rotate(-28 14.5 19.5)" fill="#EACB6A" />
      <ellipse cx="21.5" cy="19.5" rx="2.5" ry="4.2" transform="rotate(28 21.5 19.5)" fill="#E0BC55" />
    </>
  ),
  "jeczmien-ozimy": (
    <>
      <path d="M18 34 V14" stroke="#B88A2E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 12 L9 2 M18 9 L18 1 M21 12 L27 2 M15 18 L8 9 M21 18 L28 9" stroke="#C9A04A" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="18" cy="10" rx="2.4" ry="3.8" fill="#E5B550" />
      <ellipse cx="15" cy="14.5" rx="2.4" ry="3.8" transform="rotate(-24 15 14.5)" fill="#E5B550" />
      <ellipse cx="21" cy="14.5" rx="2.4" ry="3.8" transform="rotate(24 21 14.5)" fill="#DDA944" />
      <ellipse cx="15" cy="20.5" rx="2.4" ry="3.8" transform="rotate(-24 15 20.5)" fill="#E5B550" />
      <ellipse cx="21" cy="20.5" rx="2.4" ry="3.8" transform="rotate(24 21 20.5)" fill="#DDA944" />
    </>
  ),
  "jeczmien-jary": (
    <>
      <path d="M18 34 V14" stroke="#B88A2E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 31 C 24 29, 28 25, 29 20 C 24 22, 20 25, 18 29 Z" fill="#7FAE45" />
      <path d="M15 12 L9 2 M18 9 L18 1 M21 12 L27 2 M15 18 L8 9 M21 18 L28 9" stroke="#D2B862" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="18" cy="10" rx="2.4" ry="3.8" fill="#EDD27A" />
      <ellipse cx="15" cy="14.5" rx="2.4" ry="3.8" transform="rotate(-24 15 14.5)" fill="#EDD27A" />
      <ellipse cx="21" cy="14.5" rx="2.4" ry="3.8" transform="rotate(24 21 14.5)" fill="#E3C35E" />
      <ellipse cx="15" cy="20.5" rx="2.4" ry="3.8" transform="rotate(-24 15 20.5)" fill="#EDD27A" />
      <ellipse cx="21" cy="20.5" rx="2.4" ry="3.8" transform="rotate(24 21 20.5)" fill="#E3C35E" />
    </>
  ),
  zyto: (
    <>
      <path d="M18 34 V16" stroke="#A88A4E" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 6 L13 1 M20 6 L23 1" stroke="#B9A26A" strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="16" cy="9" rx="1.9" ry="3.4" transform="rotate(-14 16 9)" fill="#C9B27A" />
      <ellipse cx="20" cy="9" rx="1.9" ry="3.4" transform="rotate(14 20 9)" fill="#B9A26A" />
      <ellipse cx="16" cy="14" rx="1.9" ry="3.4" transform="rotate(-14 16 14)" fill="#C9B27A" />
      <ellipse cx="20" cy="14" rx="1.9" ry="3.4" transform="rotate(14 20 14)" fill="#B9A26A" />
      <ellipse cx="16" cy="19" rx="1.9" ry="3.4" transform="rotate(-14 16 19)" fill="#C9B27A" />
      <ellipse cx="20" cy="19" rx="1.9" ry="3.4" transform="rotate(14 20 19)" fill="#B9A26A" />
      <ellipse cx="15.5" cy="8" rx=".7" ry="1.6" fill="#FFFFFF" opacity=".5" />
    </>
  ),
  pszenzyto: (
    <>
      <path d="M18 34 V12" stroke="#B88A2E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 10 L11 5 M22 10 L25 5 M14 16 L10 12 M22 16 L26 12" stroke="#C9A04A" strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="18" cy="8" rx="2.8" ry="4.2" fill="#DDB45A" />
      <ellipse cx="14.5" cy="13.5" rx="3" ry="4.4" transform="rotate(-26 14.5 13.5)" fill="#DDB45A" />
      <ellipse cx="21.5" cy="13.5" rx="3" ry="4.4" transform="rotate(26 21.5 13.5)" fill="#D2A748" />
      <ellipse cx="14.5" cy="20.5" rx="3" ry="4.4" transform="rotate(-26 14.5 20.5)" fill="#DDB45A" />
      <ellipse cx="21.5" cy="20.5" rx="3" ry="4.4" transform="rotate(26 21.5 20.5)" fill="#D2A748" />
      <ellipse cx="13.5" cy="12.5" rx="1" ry="2" fill="#FFFFFF" opacity=".5" />
    </>
  ),
  owies: (
    <>
      <path d="M18 34 V5" stroke="#B88A2E" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 9 C 14 9, 11 11, 10 15 M18 9 C 22 9, 25 11, 26 15 M18 17 C 14 17, 11 19, 10 23 M18 17 C 22 17, 25 19, 26 23" stroke="#B88A2E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="10" cy="17" rx="2" ry="3.2" fill="#E8CF7C" />
      <ellipse cx="26" cy="17" rx="2" ry="3.2" fill="#DCC06A" />
      <ellipse cx="10" cy="25" rx="2" ry="3.2" fill="#E8CF7C" />
      <ellipse cx="26" cy="25" rx="2" ry="3.2" fill="#DCC06A" />
      <ellipse cx="18" cy="5" rx="2" ry="3.2" fill="#E8CF7C" />
    </>
  ),
  "kukurydza-kiszonka": (
    <>
      <path d="M18 34 V6" stroke="#6E9B3A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18 26 C 12 24, 7 20, 4 13 C 10 16, 15 19, 18 23 Z" fill="#7FAE45" />
      <path d="M18 20 C 24 18, 29 14, 32 7 C 26 10, 21 13, 18 17 Z" fill="#6E9B3A" />
      <path d="M18 13 C 14 11, 11 8, 10 3 C 14 6, 17 8, 18 11 Z" fill="#8DB54A" />
      <ellipse cx="22" cy="25" rx="2.6" ry="5" transform="rotate(18 22 25)" fill="#F0C24B" />
      <path d="M20.5 22 C 22 23, 23 26, 23 29" stroke="#7FAE45" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  chmiel: (
    <>
      <path d="M18 2 V8" stroke="#6E9B3A" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 7 C 12 9, 10 15, 11 21 C 12 27, 15 31, 18 33 C 21 31, 24 27, 25 21 C 26 15, 24 9, 18 7 Z" fill="#9CC35A" />
      <path d="M12 15 C 15 17, 21 17, 24 15 M11.5 21 C 15 23.5, 21 23.5, 24.5 21 M13 27 C 15.5 29, 20.5 29, 23 27" stroke="#6E9B3A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M18 9 V31" stroke="#7FAE45" strokeWidth="1" />
      <ellipse cx="14.5" cy="13" rx="1.4" ry="2.6" fill="#FFFFFF" opacity=".45" />
    </>
  ),
  tyton: (
    <>
      <path d="M18 34 V12" stroke="#6E9B3A" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 30 C 8 30, 2 24, 3 16 C 10 17, 16 22, 17 30 Z" fill="#7FAE45" />
      <path d="M19 25 C 28 25, 34 19, 33 11 C 26 12, 20 17, 19 25 Z" fill="#8DB54A" />
      <path d="M17 30 C 12 26, 8 21, 4 17 M19 25 C 24 21, 28 16, 32 12" stroke="#5E8A33" strokeWidth="1" fill="none" />
      <path d="M16 6 L18 11 L20 6 Z" fill="#E59AB0" />
      <path d="M13 8 L17 12 M23 8 L19 12" stroke="#E59AB0" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  straczkowe: (
    <>
      <path d="M4 22 C 8 12, 20 6, 32 8 C 30 18, 18 28, 6 26 Z" fill="#7FAE45" />
      <circle cx="11" cy="19.5" r="3.2" fill="#B5D86E" />
      <circle cx="17.5" cy="16" r="3.4" fill="#B5D86E" />
      <circle cx="24" cy="12.8" r="3.2" fill="#B5D86E" />
      <path d="M4 22 C 12 22, 24 18, 32 8" stroke="#5E8A33" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="16.5" cy="15" r="1" fill="#FFFFFF" opacity=".6" />
    </>
  ),
  warzywa: (
    <>
      <path d="M17 11 C 13 4, 9 3, 7 5 C 10 7, 13 9, 15 12 Z M19 11 C 19 4, 21 1, 24 1 C 23 5, 22 8, 20 12 Z M20 12 C 24 7, 28 6, 30 8 C 27 10, 24 12, 21 14 Z" fill="#7FAE45" />
      <path d="M13 13 C 15 10, 22 10, 24 13 C 24 19, 21 27, 18 34 C 15 27, 13 19, 13 13 Z" fill="#E98A3A" />
      <path d="M15 17 h4 M16 22 h4 M17 27 h2.5" stroke="#C96A24" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="15.5" cy="15" rx="1" ry="2.6" fill="#FFFFFF" opacity=".45" />
    </>
  ),
  truskawki: (
    <>
      <path d="M18 34 C 10 29, 6 22, 7 16 C 8 11, 13 10, 18 12 C 23 10, 28 11, 29 16 C 30 22, 26 29, 18 34 Z" fill="#D2352B" />
      <path d="M18 12 L12 7 L16 10 L18 4 L20 10 L24 7 Z" fill="#6E9B3A" />
      <path d="M11 9 L18 13 L25 9 C 23 13, 13 13, 11 9 Z" fill="#7FAE45" />
      <circle cx="13" cy="18" r=".9" fill="#F3D27A" />
      <circle cx="18" cy="17" r=".9" fill="#F3D27A" />
      <circle cx="23" cy="18" r=".9" fill="#F3D27A" />
      <circle cx="15" cy="23" r=".9" fill="#F3D27A" />
      <circle cx="21" cy="23" r=".9" fill="#F3D27A" />
      <circle cx="18" cy="28" r=".9" fill="#F3D27A" />
      <ellipse cx="12" cy="16" rx="1.4" ry="2.4" fill="#FFFFFF" opacity=".4" />
    </>
  ),
  krzewy: (
    <>
      <path d="M6 6 C 14 8, 20 12, 24 22" stroke="#6E9B3A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M22 4 C 30 2, 34 8, 32 13 C 27 13, 23 9, 22 4 Z" fill="#7FAE45" />
      <path d="M27 6 L31 12" stroke="#5E8A33" strokeWidth="1" />
      <circle cx="12" cy="14" r="3.6" fill="#C8323C" />
      <circle cx="18" cy="18" r="3.8" fill="#B52A35" />
      <circle cx="13" cy="21" r="3.6" fill="#C8323C" />
      <circle cx="20" cy="25" r="3.8" fill="#B52A35" />
      <circle cx="15" cy="28" r="3.6" fill="#C8323C" />
      <circle cx="11" cy="13" r="1.1" fill="#FFFFFF" opacity=".55" />
      <circle cx="17" cy="17" r="1.1" fill="#FFFFFF" opacity=".55" />
    </>
  ),
  sad: (
    <>
      <path d="M18 34 V22 M18 26 L13 21 M18 24 L23 19" stroke="#8A6234" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="14" r="11" fill="#7FAE45" />
      <circle cx="12" cy="17" r="6" fill="#6E9B3A" />
      <circle cx="24" cy="17" r="6" fill="#6E9B3A" />
      <circle cx="13" cy="10" r="2.2" fill="#D9473A" />
      <circle cx="22" cy="9" r="2.2" fill="#D9473A" />
      <circle cx="19" cy="17" r="2.2" fill="#D9473A" />
      <circle cx="11" cy="19" r="2" fill="#D9473A" />
      <circle cx="26" cy="18" r="2" fill="#D9473A" />
      <ellipse cx="14" cy="7" rx="3" ry="1.6" fill="#FFFFFF" opacity=".35" />
    </>
  ),
}
