import type { SceneFacts } from "@/components/diorama/diorama-scene"
import type { Analysis, SceneMode, WaterStatus } from "@/lib/types"

export function sceneFacts(analysis: Analysis): SceneFacts {
  return { areaHa: analysis.parcel.areaHa, slopePct: analysis.scene?.slopePct ?? null, ditch: analysis.scene?.ditchNearby ?? null }
}

export function baseSceneMode(status: WaterStatus): SceneMode {
  return status.level >= 3 ? "susza" : "hero"
}
