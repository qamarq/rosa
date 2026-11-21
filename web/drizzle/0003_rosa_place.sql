CREATE TABLE "rosa_place" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"gmina" text,
	"woj" text NOT NULL,
	"name_norm" text NOT NULL,
	"parcels" integer NOT NULL,
	"lon" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"min_lon" double precision NOT NULL,
	"min_lat" double precision NOT NULL,
	"max_lon" double precision NOT NULL,
	"max_lat" double precision NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rosa_place_name_norm_idx" ON "rosa_place" USING btree ("name_norm" text_pattern_ops);