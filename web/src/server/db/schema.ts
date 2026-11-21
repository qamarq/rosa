import { customType, date, doublePrecision, geometry, index, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp } from "drizzle-orm/pg-core"

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

export const meteoLiveSample = pgTable(
  "meteo_live_sample",
  {
    stationCode: text("station_code").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    tempC: real("temp_c"),
    precip10minMm: real("precip_10min_mm"),
  },
  (t) => [primaryKey({ columns: [t.stationCode, t.ts] }), index("meteo_live_sample_ts_idx").on(t.ts)],
)

export const meteoDailyLive = pgTable(
  "meteo_daily_live",
  {
    stationCode: text("station_code").notNull(),
    day: date("day").notNull(),
    precipMm: real("precip_mm"),
    tmaxC: real("tmax_c"),
    tminC: real("tmin_c"),
    samplesPrecip: integer("samples_precip").notNull(),
    samplesTemp: integer("samples_temp").notNull(),
  },
  (t) => [primaryKey({ columns: [t.stationCode, t.day] }), index("meteo_daily_live_day_idx").on(t.day)],
)

const geometry2180 = customType<{ data: string }>({
  dataType: () => "geometry(Geometry, 2180)",
})

export const hydroFeature = pgTable(
  "hydro_feature",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    subkind: text("subkind"),
    name: text("name"),
    teryt: text("teryt"),
    geom: geometry2180("geom").notNull(),
  },
  (t) => [index("hydro_feature_geom_idx").using("gist", t.geom), index("hydro_feature_kind_idx").on(t.kind)],
)

export const hydroGauge = pgTable(
  "hydro_gauge",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    river: text("river"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    warningCm: integer("warning_cm"),
    alarmCm: integer("alarm_cm"),
    geom: geometry("geom", { type: "point", mode: "xy", srid: 4326 }).notNull(),
  },
  (t) => [index("hydro_gauge_geom_idx").using("gist", t.geom)],
)

export const hydroGaugeDaily = pgTable(
  "hydro_gauge_daily",
  {
    code: text("code").notNull(),
    day: date("day").notNull(),
    levelCm: real("level_cm"),
    flowM3s: real("flow_m3s"),
  },
  (t) => [primaryKey({ columns: [t.code, t.day] }), index("hydro_gauge_daily_day_idx").on(t.day)],
)

export const rosaPlace = pgTable(
  "rosa_place",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    gmina: text("gmina"),
    woj: text("woj").notNull(),
    nameNorm: text("name_norm").notNull(),
    parcels: integer("parcels").notNull(),
    lon: doublePrecision("lon").notNull(),
    lat: doublePrecision("lat").notNull(),
    minLon: doublePrecision("min_lon").notNull(),
    minLat: doublePrecision("min_lat").notNull(),
    maxLon: doublePrecision("max_lon").notNull(),
    maxLat: doublePrecision("max_lat").notNull(),
  },
  (t) => [index("rosa_place_name_norm_idx").on(t.nameNorm.op("text_pattern_ops"))],
)
