import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { databaseUrl } from "@/server/env"
import * as schema from "./schema"

type Db = ReturnType<typeof createDb>

function createDb() {
  const client = postgres(databaseUrl(), {
    max: 8,
    idle_timeout: 30,
    connect_timeout: 10,
    connection: { application_name: "rosa-web", statement_timeout: 8000 },
  })
  return drizzle({ client, schema })
}

const globalForDb = globalThis as unknown as { rosaDb?: Db }

export function db(): Db {
  if (!globalForDb.rosaDb) globalForDb.rosaDb = createDb()
  return globalForDb.rosaDb
}
