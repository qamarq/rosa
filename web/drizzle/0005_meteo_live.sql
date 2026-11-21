CREATE TABLE "meteo_daily_live" (
	"station_code" text NOT NULL,
	"day" date NOT NULL,
	"precip_mm" real,
	"tmax_c" real,
	"tmin_c" real,
	"samples_precip" integer NOT NULL,
	"samples_temp" integer NOT NULL,
	CONSTRAINT "meteo_daily_live_station_code_day_pk" PRIMARY KEY("station_code","day")
);
--> statement-breakpoint
CREATE TABLE "meteo_live_sample" (
	"station_code" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"temp_c" real,
	"precip_10min_mm" real,
	CONSTRAINT "meteo_live_sample_station_code_ts_pk" PRIMARY KEY("station_code","ts")
);
--> statement-breakpoint
CREATE INDEX "meteo_daily_live_day_idx" ON "meteo_daily_live" USING btree ("day");--> statement-breakpoint
CREATE INDEX "meteo_live_sample_ts_idx" ON "meteo_live_sample" USING btree ("ts");