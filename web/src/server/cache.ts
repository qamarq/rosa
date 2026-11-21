import "server-only"
import { and, eq, gt, isNull, or, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { rosaCache } from "@/server/db/schema"

export async function readCache<T>(source: string, key: string): Promise<T | null> {
  try {
    const rows = await db()
      .select({ payload: rosaCache.payload })
      .from(rosaCache)
      .where(
        and(
          eq(rosaCache.source, source),
          eq(rosaCache.key, key),
          or(isNull(rosaCache.expiresAt), gt(rosaCache.expiresAt, sql`now()`)),
        ),
      )
      .limit(1)
    return (rows[0]?.payload as T) ?? null
  } catch {
    return null
  }
}

export async function writeCache(source: string, key: string, payload: unknown, ttlSeconds: number | null) {
  const expiresAt = ttlSeconds === null ? null : new Date(Date.now() + ttlSeconds * 1000)
  try {
    await db()
      .insert(rosaCache)
      .values({ source, key, payload, expiresAt })
      .onConflictDoUpdate({
        target: [rosaCache.source, rosaCache.key],
        set: { payload, expiresAt, fetchedAt: sql`now()` },
      })
  } catch {
    return
  }
}

export async function cached<T>(source: string, key: string, ttlSeconds: number | null, load: () => Promise<T>): Promise<T> {
  const hit = await readCache<T>(source, key)
  if (hit !== null) return hit
  const value = await load()
  void writeCache(source, key, value, ttlSeconds)
  return value
}
