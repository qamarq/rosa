CREATE TABLE "hydro_feature" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"subkind" text,
	"name" text,
	"teryt" text,
	"geom" geometry(Geometry, 2180) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hydro_feature_geom_idx" ON "hydro_feature" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "hydro_feature_kind_idx" ON "hydro_feature" USING btree ("kind");