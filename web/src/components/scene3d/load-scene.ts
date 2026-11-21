import type { ParcelScene } from "@/lib/scene3d"

const cache = new Map<string, Promise<ParcelScene | null>>()
const TIMEOUT_MS = 8000

export function loadParcelScene(analysisId: string): Promise<ParcelScene | null> {
  const hit = cache.get(analysisId)
  if (hit) return hit
  const promise = fetch(`/api/analyses/${analysisId}/scene`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((res) => (res.ok ? (res.json() as Promise<ParcelScene>) : null))
    .then((scene) => (scene && scene.grid?.heights?.length === scene.grid.size * scene.grid.size && scene.parcel?.length ? scene : null))
    .catch(() => null)
  promise.then((scene) => {
    if (!scene) cache.delete(analysisId)
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
