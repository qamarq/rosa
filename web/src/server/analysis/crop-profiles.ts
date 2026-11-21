import type { CropId } from "@/lib/types"

export type CropProfile = {
  kc: Partial<Record<number, number>>
  ndvi: number[]
  critical: number[]
  criticalLabel: string
  afterHarvest: string
  noun: string
  gender: "m" | "f" | "n" | "pl"
  perennial?: boolean
}

export const CROP_PROFILES: Record<CropId, CropProfile> = {
  pszenica: { ndvi: [0.35, 0.35, 0.45, 0.65, 0.8, 0.75, 0.45, 0.25, 0.25, 0.35, 0.4, 0.35], kc: { 3: 0.7, 4: 1.0, 5: 1.15, 6: 1.15, 7: 0.6 }, critical: [5, 6], criticalLabel: "kłoszenia i nalewania ziarna", afterHarvest: "Zaraz po żniwach", noun: "pszenica", gender: "f" },
  kukurydza: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.8, 0.65, 0.3, 0.2, 0.2], kc: { 5: 0.4, 6: 0.8, 7: 1.2, 8: 1.2, 9: 0.8 }, critical: [7, 8], criticalLabel: "kwitnienia i zawiązywania kolb", afterHarvest: "Po zbiorze kukurydzy", noun: "kukurydza", gender: "f" },
  rzepak: { ndvi: [0.45, 0.45, 0.5, 0.75, 0.7, 0.7, 0.35, 0.25, 0.4, 0.6, 0.55, 0.45], kc: { 3: 0.8, 4: 1.1, 5: 1.15, 6: 0.9 }, critical: [4, 5], criticalLabel: "kwitnienia", afterHarvest: "Zaraz po żniwach", noun: "rzepak", gender: "m" },
  ziemniaki: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.65, 0.8, 0.65, 0.4, 0.2, 0.2, 0.2], kc: { 5: 0.5, 6: 1.0, 7: 1.15, 8: 0.9 }, critical: [6, 7], criticalLabel: "zawiązywania bulw", afterHarvest: "Po wykopkach", noun: "ziemniaki", gender: "pl" },
  buraki: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.65, 0.8, 0.8, 0.75, 0.6, 0.2, 0.2], kc: { 5: 0.4, 6: 0.9, 7: 1.2, 8: 1.2, 9: 1.0 }, critical: [7, 8], criticalLabel: "intensywnego wzrostu korzeni", afterHarvest: "Po zbiorze buraków", noun: "buraki", gender: "pl" },
  laka: { ndvi: [0.45, 0.45, 0.5, 0.6, 0.75, 0.75, 0.7, 0.7, 0.7, 0.6, 0.5, 0.45], kc: { 4: 0.9, 5: 1.0, 6: 1.0, 7: 1.0, 8: 0.95, 9: 0.9 }, critical: [5, 6, 7], criticalLabel: "odrastania po pokosie", afterHarvest: "Po ostatnim pokosie", noun: "łąka", gender: "f", perennial: true },
  "pszenica-jara": { ndvi: [0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.55, 0.25, 0.25, 0.25, 0.2, 0.2], kc: { 4: 0.4, 5: 0.85, 6: 1.15, 7: 0.85 }, critical: [6, 7], criticalLabel: "kłoszenia i nalewania ziarna", afterHarvest: "Zaraz po żniwach", noun: "pszenica jara", gender: "f" },
  "jeczmien-ozimy": { ndvi: [0.35, 0.35, 0.5, 0.7, 0.8, 0.6, 0.3, 0.25, 0.3, 0.4, 0.45, 0.35], kc: { 3: 0.75, 4: 1.05, 5: 1.15, 6: 0.85 }, critical: [4, 5], criticalLabel: "strzelania w źdźbło i kłoszenia", afterHarvest: "Zaraz po żniwach", noun: "jęczmień ozimy", gender: "m" },
  "jeczmien-jary": { ndvi: [0.2, 0.2, 0.2, 0.35, 0.65, 0.8, 0.45, 0.25, 0.25, 0.25, 0.2, 0.2], kc: { 4: 0.4, 5: 0.9, 6: 1.15, 7: 0.7 }, critical: [5, 6], criticalLabel: "strzelania w źdźbło i kłoszenia", afterHarvest: "Zaraz po żniwach", noun: "jęczmień jary", gender: "m" },
  zyto: { ndvi: [0.35, 0.35, 0.45, 0.65, 0.8, 0.65, 0.4, 0.25, 0.25, 0.35, 0.4, 0.35], kc: { 3: 0.7, 4: 1.0, 5: 1.15, 6: 1.05, 7: 0.5 }, critical: [5, 6], criticalLabel: "kłoszenia i nalewania ziarna", afterHarvest: "Zaraz po żniwach", noun: "żyto", gender: "n" },
  pszenzyto: { ndvi: [0.35, 0.35, 0.45, 0.65, 0.8, 0.75, 0.45, 0.25, 0.25, 0.35, 0.4, 0.35], kc: { 3: 0.7, 4: 1.0, 5: 1.15, 6: 1.15, 7: 0.6 }, critical: [5, 6], criticalLabel: "kłoszenia i nalewania ziarna", afterHarvest: "Zaraz po żniwach", noun: "pszenżyto", gender: "n" },
  owies: { ndvi: [0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.65, 0.3, 0.25, 0.25, 0.2, 0.2], kc: { 4: 0.4, 5: 0.85, 6: 1.15, 7: 1.0 }, critical: [6, 7], criticalLabel: "wiechowania i nalewania ziarna", afterHarvest: "Zaraz po żniwach", noun: "owies", gender: "m" },
  "kukurydza-kiszonka": { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.8, 0.5, 0.25, 0.2, 0.2], kc: { 5: 0.4, 6: 0.8, 7: 1.15, 8: 1.15, 9: 1.05 }, critical: [7, 8], criticalLabel: "kwitnienia i zawiązywania kolb", afterHarvest: "Po zbiorze kukurydzy", noun: "kukurydza na kiszonkę", gender: "f" },
  straczkowe: { ndvi: [0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.6, 0.3, 0.25, 0.25, 0.2, 0.2], kc: { 4: 0.5, 5: 0.8, 6: 1.15, 7: 0.9 }, critical: [6, 7], criticalLabel: "kwitnienia i zawiązywania strąków", afterHarvest: "Zaraz po zbiorze", noun: "rośliny strączkowe", gender: "pl" },
  warzywa: { ndvi: [0.2, 0.2, 0.2, 0.25, 0.35, 0.55, 0.7, 0.7, 0.6, 0.4, 0.25, 0.2], kc: { 5: 0.7, 6: 0.9, 7: 1.05, 8: 1.05, 9: 0.95 }, critical: [6, 7, 8], criticalLabel: "intensywnego wzrostu i formowania plonu", afterHarvest: "Po zbiorze warzyw", noun: "warzywa", gender: "pl" },
  truskawki: { ndvi: [0.3, 0.3, 0.35, 0.45, 0.6, 0.65, 0.6, 0.6, 0.55, 0.5, 0.4, 0.3], kc: { 4: 0.45, 5: 0.75, 6: 0.85, 7: 0.8, 8: 0.75, 9: 0.7 }, critical: [5, 6], criticalLabel: "kwitnienia i owocowania", afterHarvest: "Po zbiorze owoców", noun: "truskawki", gender: "pl", perennial: true },
  krzewy: { ndvi: [0.3, 0.3, 0.3, 0.4, 0.6, 0.7, 0.7, 0.65, 0.6, 0.5, 0.35, 0.3], kc: { 4: 0.4, 5: 0.8, 6: 1.05, 7: 1.05, 8: 0.9, 9: 0.6 }, critical: [6, 7], criticalLabel: "wzrostu i dojrzewania owoców", afterHarvest: "Po zbiorze owoców", noun: "krzewy owocowe", gender: "pl", perennial: true },
  sad: { ndvi: [0.35, 0.35, 0.4, 0.55, 0.7, 0.75, 0.75, 0.75, 0.7, 0.6, 0.45, 0.35], kc: { 4: 0.6, 5: 0.85, 6: 1.0, 7: 1.05, 8: 1.05, 9: 0.9, 10: 0.75 }, critical: [6, 7], criticalLabel: "wzrostu owoców", afterHarvest: "Po zbiorze owoców", noun: "sad", gender: "m", perennial: true },
  chmiel: { ndvi: [0.2, 0.2, 0.2, 0.25, 0.35, 0.6, 0.75, 0.75, 0.5, 0.25, 0.2, 0.2], kc: { 4: 0.3, 5: 0.5, 6: 0.9, 7: 1.05, 8: 1.05, 9: 0.85 }, critical: [7, 8], criticalLabel: "kwitnienia i wiązania szyszek", afterHarvest: "Po zbiorze szyszek", noun: "chmiel", gender: "m", perennial: true },
  tyton: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 0.75, 0.7, 0.5, 0.25, 0.2, 0.2], kc: { 5: 0.4, 6: 0.75, 7: 1.1, 8: 1.05, 9: 0.8 }, critical: [6, 7], criticalLabel: "intensywnego wzrostu liści", afterHarvest: "Po zbiorze liści", noun: "tytoń", gender: "m" },
}

export const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"]

export const MONTHS_GEN_PL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"]

export const NDVI_SEASON_MIN = 0.55

export function expectedNdvi(crop: CropId, isoDate: string): number {
  return CROP_PROFILES[crop].ndvi[Number(isoDate.slice(5, 7)) - 1]
}
