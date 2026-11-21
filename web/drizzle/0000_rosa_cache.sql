CREATE TABLE "rosa_cache" (
	"source" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "rosa_cache_source_key_pk" PRIMARY KEY("source","key")
);
--> statement-breakpoint
CREATE INDEX "rosa_cache_expires_idx" ON "rosa_cache" USING btree ("expires_at");