import "server-only"

const USER_AGENT = "rosa-hacknation/0.1"

export async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init?.headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).host}`)
  return res
}

export async function fetchJson<T>(url: string, timeoutMs: number, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(url, timeoutMs, init)
  return (await res.json()) as T
}

export async function fetchText(url: string, timeoutMs: number, init?: RequestInit): Promise<string> {
  const res = await fetchWithTimeout(url, timeoutMs, init)
  return res.text()
}
