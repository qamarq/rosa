import type { CropId } from "@/lib/types"

export type CropProfile = {
  kc: Partial<Record<number, number>>
  ndvi: number[]
  critical: number[]
  criticalLabel: string
  afterHarvest: string
}

export const CROP_PROFILES: Record<CropId, CropProfile> = {
  pszenica: { ndvi: [0.35, 0.35, 0.45, 0.65, 0.8, 0.75, 0.45, 0.25, 0.25, 0.35, 0.4, 0.35], kc: { 3: 0.7, 4: 1.0, 5: 1.15, 6: 1.15, 7: 0.6 }, critical: [5, 6], criticalLabel: "kłoszenia i nalewania ziarna", afterHarvest: "Zaraz po żniwach" },
  kukurydza: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.6, 0.8, 0.8, 0.65, 0.3, 0.2, 0.2], kc: { 5: 0.4, 6: 0.8, 7: 1.2, 8: 1.2, 9: 0.8 }, critical: [7, 8], criticalLabel: "kwitnienia i zawiązywania kolb", afterHarvest: "Po zbiorze kukurydzy" },
  rzepak: { ndvi: [0.45, 0.45, 0.5, 0.75, 0.7, 0.7, 0.35, 0.25, 0.4, 0.6, 0.55, 0.45], kc: { 3: 0.8, 4: 1.1, 5: 1.15, 6: 0.9 }, critical: [4, 5], criticalLabel: "kwitnienia", afterHarvest: "Zaraz po żniwach" },
  ziemniaki: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.65, 0.8, 0.65, 0.4, 0.2, 0.2, 0.2], kc: { 5: 0.5, 6: 1.0, 7: 1.15, 8: 0.9 }, critical: [6, 7], criticalLabel: "zawiązywania bulw", afterHarvest: "Po wykopkach" },
  buraki: { ndvi: [0.2, 0.2, 0.2, 0.2, 0.3, 0.65, 0.8, 0.8, 0.75, 0.6, 0.2, 0.2], kc: { 5: 0.4, 6: 0.9, 7: 1.2, 8: 1.2, 9: 1.0 }, critical: [7, 8], criticalLabel: "intensywnego wzrostu korzeni", afterHarvest: "Po zbiorze buraków" },
  laka: { ndvi: [0.45, 0.45, 0.5, 0.6, 0.75, 0.75, 0.7, 0.7, 0.7, 0.6, 0.5, 0.45], kc: { 4: 0.9, 5: 1.0, 6: 1.0, 7: 1.0, 8: 0.95, 9: 0.9 }, critical: [5, 6, 7], criticalLabel: "odrastania po pokosie", afterHarvest: "Po ostatnim pokosie" },
}

export const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"]

export const MONTHS_GEN_PL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"]

export const NDVI_SEASON_MIN = 0.55

export function expectedNdvi(crop: CropId, isoDate: string): number {
  return CROP_PROFILES[crop].ndvi[Number(isoDate.slice(5, 7)) - 1]
}
