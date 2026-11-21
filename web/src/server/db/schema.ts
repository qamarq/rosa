import { index, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const rosaCache = pgTable(
  "rosa_cache",
  {
    source: text("source").notNull(),
    key: text("key").notNull(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.source, t.key] }), index("rosa_cache_expires_idx").on(t.expiresAt)],
)
