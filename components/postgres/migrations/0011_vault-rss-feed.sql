ALTER TABLE "nodevault"."vaults" ADD COLUMN "rss_feed_url" text;--> statement-breakpoint
ALTER TABLE "nodevault"."vaults" ADD COLUMN "rss_last_polled_at" timestamp with time zone;