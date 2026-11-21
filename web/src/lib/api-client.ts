import type { Analysis, AnalysisError, AnalysisRequest } from "@/lib/types"

export type ClientResult = { ok: true; analysis: Analysis } | { ok: false; error: AnalysisError | { code: "network"; message: string } }

export async function requestAnalysis(req: AnalysisRequest, signal?: AbortSignal): Promise<ClientResult> {
  try {
    const res = await fetch("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    })
    const data = await res.json()
    return res.ok ? { ok: true, analysis: data as Analysis } : { ok: false, error: data as AnalysisError }
  } catch {
    return { ok: false, error: { code: "network", message: "Brak połączenia z serwerem." } }
  }
}
