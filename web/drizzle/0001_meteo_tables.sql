CREATE TABLE "meteo_daily" (
	"station_code" text NOT NULL,
	"day" date NOT NULL,
	"precip_mm" real,
	"tmax_c" real,
	"tmin_c" real,
	"sunshine_h" real,
	"source" text NOT NULL,
	CONSTRAINT "meteo_daily_station_code_day_pk" PRIMARY KEY("station_code","day")
);
--> statement-breakpoint
CREATE TABLE "meteo_station" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"elevation_m" integer,
	"has_temperature" integer DEFAULT 0 NOT NULL,
	"geom" geometry(point) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "meteo_daily_day_idx" ON "meteo_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "meteo_station_geom_idx" ON "meteo_station" USING gist ("geom");