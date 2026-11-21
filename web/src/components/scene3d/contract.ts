import type { ParcelScene, Ring } from "@/lib/scene3d"
import type { CropId, DroughtLevel, SceneMode } from "@/lib/types"

export type Vec3 = [number, number, number]

export type WorldContext = {
  scene: ParcelScene
  metersToWorld: number
  verticalExaggeration: number
  toWorld: (x: number, y: number, lift?: number) => Vec3
  heightAt: (x: number, y: number) => number
  insideParcel: (x: number, y: number) => boolean
  parcelRadiusM: number
  parcelOuterRing: Ring
  nearestDitch: { kind: "rów" | "ciek" | "kanał"; points: Ring; distanceM: number } | null
  downslope: { x: number; y: number; slopePct: number }
  lowestParcelPoint: [number, number]
}

export type SceneWeather = {
  level: DroughtLevel
  hot: boolean
  dry: boolean
  wet: boolean
}

export type SceneActorsProps = {
  ctx: WorldContext
  mode: SceneMode
  crop: CropId
  weather: SceneWeather
  ndvi: number | null
  animate: boolean
  quality: "high" | "low"
}
