import type { CropId } from "@/lib/types"

export type CropGroup = "zboza" | "okopowe" | "warzywa" | "laki"

export type CropOption = {
  id: CropId
  label: string
  group: CropGroup
  short?: string
  hint?: string
  aliases?: string[]
}

export const CROP_GROUPS: { id: CropGroup; label: string }[] = [
  { id: "zboza", label: "Zboża i kukurydza" },
  { id: "okopowe", label: "Okopowe i przemysłowe" },
  { id: "warzywa", label: "Warzywa, owoce, strączkowe" },
  { id: "laki", label: "Łąki" },
]

export const CROPS: CropOption[] = [
  { id: "pszenica", label: "Pszenica", group: "zboza", hint: "ozima", aliases: ["pszenica ozima"] },
  { id: "pszenica-jara", label: "Pszenica jara", group: "zboza" },
  { id: "jeczmien-ozimy", label: "Jęczmień ozimy", group: "zboza" },
  { id: "jeczmien-jary", label: "Jęczmień jary", group: "zboza", aliases: ["jęczmień browarny"] },
  { id: "zyto", label: "Żyto", group: "zboza", hint: "ozime" },
  { id: "pszenzyto", label: "Pszenżyto", group: "zboza", hint: "ozime" },
  { id: "owies", label: "Owies", group: "zboza", aliases: ["mieszanka zbożowa"] },
  { id: "kukurydza", label: "Kukurydza", group: "zboza", hint: "na ziarno", aliases: ["kukurydza na ziarno"] },
  { id: "kukurydza-kiszonka", label: "Kukurydza na kiszonkę", short: "Kukurydza kiszonka", group: "zboza", aliases: ["kiszonka", "kukurydza na zielonkę"] },
  { id: "ziemniaki", label: "Ziemniaki", group: "okopowe", aliases: ["ziemniak", "kartofle"] },
  { id: "buraki", label: "Buraki", group: "okopowe", hint: "cukrowe", aliases: ["burak cukrowy"] },
  { id: "rzepak", label: "Rzepak", group: "okopowe", hint: "i rzepik", aliases: ["rzepik"] },
  { id: "chmiel", label: "Chmiel", group: "okopowe" },
  { id: "tyton", label: "Tytoń", group: "okopowe" },
  { id: "straczkowe", label: "Strączkowe", group: "warzywa", hint: "groch, bobik, łubin, soja", aliases: ["groch", "bobik", "łubin", "soja", "fasola", "peluszka", "wyka"] },
  { id: "warzywa", label: "Warzywa", group: "warzywa", hint: "gruntowe: kapusta, marchew, cebula", aliases: ["warzywa gruntowe", "kapusta", "marchew", "cebula", "kalafior", "brokuł", "ogórek", "pomidor", "por", "seler"] },
  { id: "truskawki", label: "Truskawki", group: "warzywa", aliases: ["truskawka", "poziomka"] },
  { id: "krzewy", label: "Krzewy owocowe", group: "warzywa", hint: "porzeczka, borówka, malina", aliases: ["porzeczka", "borówka", "malina", "aronia", "agrest", "jagody"] },
  { id: "sad", label: "Sad", group: "warzywa", hint: "drzewa owocowe", aliases: ["jabłoń", "jabłka", "wiśnia", "czereśnia", "śliwa", "grusza", "drzewa owocowe"] },
  { id: "laka", label: "Łąka", group: "laki", hint: "i pastwisko", aliases: ["pastwisko", "trawy", "użytki zielone", "tuz"] },
]

export const FEATURED_CROPS: CropId[] = ["pszenica", "kukurydza", "rzepak", "ziemniaki", "buraki", "laka"]

export function cropLabel(id: CropId): string {
  return CROPS.find((c) => c.id === id)?.label ?? id
}

export function isCropId(value: string): value is CropId {
  return CROPS.some((c) => c.id === value)
}
