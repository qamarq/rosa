import type { SceneMode, WaterStatus } from "@/lib/types"

export function baseSceneMode(status: WaterStatus): SceneMode {
  return status.level >= 3 ? "susza" : "hero"
}
