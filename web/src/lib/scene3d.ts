export type Ring = [number, number][]

export interface ParcelScene {
  parcelId: string
  halfExtentM: number
  grid: {
    size: number
    stepM: number
    heights: number[]
  }
  minHeightM: number
  maxHeightM: number
  parcel: Ring[]
  neighbors: Ring[]
  waterLines: { kind: "rów" | "ciek" | "kanał"; points: Ring }[]
  waterAreas: Ring[]
  downslope: { x: number; y: number; slopePct: number }
}
