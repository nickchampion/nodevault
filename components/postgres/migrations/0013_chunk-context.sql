ALTER TABLE "nodevault"."asset_chunks" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "nodevault"."asset_chunks" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "nodevault"."asset_chunks" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("nodevault"."asset_chunks"."context" || ' ', '') || "nodevault"."asset_chunks"."text")) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "asset_chunks_search_vector_idx" ON "nodevault"."asset_chunks" USING gin ("search_vector");
