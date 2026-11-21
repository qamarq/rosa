import "server-only"
import { NonRetriableError, cron, eventType, staticSchema } from "inngest"
import { aggregateMeteoDay, ingestMeteoSamples, previousDay, pruneMeteoSamples, warsawDate } from "@/server/ingest/meteo-live"
import { inngest } from "./client"

export const meteoAggregateEvent = eventType("rosa/meteo.aggregate", { schema: staticSchema<{ day?: string }>() })

export const meteoIngest = inngest.createFunction(
  {
    id: "meteo-live-ingest",
    name: "IMGW: pomiary telemetryczne co 5 minut",
    triggers: [cron("TZ=Europe/Warsaw */5 * * * *")],
    concurrency: { limit: 1 },
    retries: 2,
  },
  async ({ step }) => step.run("fetch-and-store", () => ingestMeteoSamples()),
)

export const meteoAggregate = inngest.createFunction(
  {
    id: "meteo-live-aggregate",
    name: "IMGW: dobowe wartości z pomiarów telemetrycznych",
    triggers: [cron("TZ=Europe/Warsaw 25 0 * * *"), meteoAggregateEvent],
    concurrency: { limit: 1 },
    retries: 5,
  },
  async ({ event, step }) => {
    const today = warsawDate()
    const requested = event.name === meteoAggregateEvent.name ? event.data.day : undefined
    const day = requested ?? previousDay(today)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || day >= today) {
      throw new NonRetriableError(`Invalid day ${day}: expected YYYY-MM-DD before ${today}`)
    }
    const aggregated = await step.run("aggregate-day", () => aggregateMeteoDay(day))
    const pruned = await step.run("prune-samples", () => pruneMeteoSamples())
    return { ...aggregated, ...pruned }
  },
)

export const functions = [meteoIngest, meteoAggregate]
