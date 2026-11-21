import type { SourceKey } from "@/lib/types"

export const TIMING = {
  trace: 1200,
  sources: 2000,
  settle: 4200,
  end: 4400,
  endWithFailure: 5800,
  slow: 6500,
  afterData: 700,
  requestTimeout: 15000,
  stuck: 5000,
  autoRetrySeconds: 30,
  chipLead: 100,
  chipStagger: 250,
  checkAfter: 300,
} as const

export type StoryStep = 0 | 1 | 2 | 3

export type StorySource = { key: SourceKey; label: string; side: "left" | "right" }

export const STORY_SOURCES: StorySource[] = [
  { key: "pogoda", label: "Pogoda · 10 lat", side: "left" },
  { key: "satelita", label: "Sentinel-2", side: "left" },
  { key: "gleba", label: "Gleba", side: "left" },
  { key: "teren", label: "Teren (NMT)", side: "right" },
  { key: "hydrologia", label: "Hydrologia", side: "right" },
]

export const FAILURE_COPY: Record<SourceKey, { title: string; body: string }> = {
  pogoda: {
    title: "Serwis pogodowy nie odpowiada.",
    body: "Liczymy dalej na danych z poprzedniego pobrania. Pewność wyniku będzie niższa.",
  },
  satelita: {
    title: "Satelita nie odpowiada.",
    body: "Liczymy dalej bez nowych zdjęć — kondycję roślin bierzemy z ostatniego dostępnego. Pewność wyniku będzie niższa.",
  },
  gleba: {
    title: "Mapa gleb nie odpowiada.",
    body: "Liczymy dalej z typową glebą dla tej okolicy. Pewność wyniku będzie niższa.",
  },
  teren: {
    title: "Model terenu nie odpowiada.",
    body: "Liczymy dalej bez spadków terenu. Pewność wyniku będzie niższa.",
  },
  hydrologia: {
    title: "Dane o ciekach nie odpowiadają.",
    body: "Liczymy dalej bez sieci rowów i cieków. Pewność wyniku będzie niższa.",
  },
}

export function delayFromSceneStart(targetMs: number, dataAt: number | null, sceneStart: number): number {
  const lateBy = dataAt === null ? 0 : Math.max(0, dataAt - sceneStart)
  return Math.max(0, targetMs - lateBy)
}
