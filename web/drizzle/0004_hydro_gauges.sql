CREATE TABLE "hydro_gauge" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"river" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"warning_cm" integer,
	"alarm_cm" integer,
	"geom" geometry(point) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hydro_gauge_daily" (
	"code" text NOT NULL,
	"day" date NOT NULL,
	"level_cm" real,
	"flow_m3s" real,
	CONSTRAINT "hydro_gauge_daily_code_day_pk" PRIMARY KEY("code","day")
);
--> statement-breakpoint
CREATE INDEX "hydro_gauge_geom_idx" ON "hydro_gauge" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "hydro_gauge_daily_day_idx" ON "hydro_gauge_daily" USING btree ("day");