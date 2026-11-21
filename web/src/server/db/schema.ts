import { date, doublePrecision, geometry, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core"

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

export const meteoStation = pgTable(
  "meteo_station",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    elevationM: integer("elevation_m"),
    hasTemperature: integer("has_temperature").notNull().default(0),
    geom: geometry("geom", { type: "point", mode: "xy", srid: 4326 }).notNull(),
  },
  (t) => [index("meteo_station_geom_idx").using("gist", t.geom)],
)

export const meteoDaily = pgTable(
  "meteo_daily",
  {
    stationCode: text("station_code").notNull(),
    day: date("day").notNull(),
    precipMm: real("precip_mm"),
    tmaxC: real("tmax_c"),
    tminC: real("tmin_c"),
    sunshineH: real("sunshine_h"),
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.stationCode, t.day] }), index("meteo_daily_day_idx").on(t.day)],
)
