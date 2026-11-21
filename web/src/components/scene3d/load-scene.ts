import type { ParcelScene } from "@/lib/scene3d"

const cache = new Map<string, Promise<ParcelScene | null>>()
const resolved = new Map<string, ParcelScene>()

export function getLoadedScene(analysisId: string): ParcelScene | null {
  return resolved.get(analysisId) ?? null
}
const TIMEOUT_MS = 8000

export function loadParcelScene(analysisId: string, timeoutMs = TIMEOUT_MS): Promise<ParcelScene | null> {
  const hit = cache.get(analysisId)
  if (hit) return hit
  const promise = fetch(`/api/analyses/${analysisId}/scene`, { signal: AbortSignal.timeout(timeoutMs) })
    .then((res) => (res.ok ? (res.json() as Promise<ParcelScene>) : null))
    .then((scene) => (scene && scene.grid?.heights?.length === scene.grid.size * scene.grid.size && scene.parcel?.length ? scene : null))
    .catch(() => null)
  promise.then((scene) => {
    if (!scene) cache.delete(analysisId)
    else {
      resolved.set(analysisId, scene)
      emit()
    }
  })
  cache.set(analysisId, promise)
  return promise
}

let webgl: boolean | null = null

export function supportsWebGL(): boolean {
  if (webgl !== null) return webgl
  try {
    const canvas = document.createElement("canvas")
    const ctx = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null
    webgl = !!ctx
    ctx?.getExtension("WEBGL_lose_context")?.loseContext()
  } catch {
    webgl = false
  }
  return webgl
}

export type Handoff = { scene: ParcelScene; released: boolean; ready: boolean }

const handoffs = new Map<string, Handoff>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function subscribeHandoff(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getHandoff(analysisId: string): Handoff | null {
  return handoffs.get(analysisId) ?? null
}

export function beginHandoff(analysisId: string, scene: ParcelScene) {
  cache.set(analysisId, Promise.resolve(scene))
  resolved.set(analysisId, scene)
  handoffs.set(analysisId, { scene, released: false, ready: false })
  emit()
}

function patchHandoff(analysisId: string, patch: Partial<Handoff>) {
  const cur = handoffs.get(analysisId)
  if (!cur) return
  handoffs.set(analysisId, { ...cur, ...patch })
  emit()
}

export const releaseHandoff = (analysisId: string) => patchHandoff(analysisId, { released: true })
export const reportHandoffReady = (analysisId: string) => patchHandoff(analysisId, { ready: true })
