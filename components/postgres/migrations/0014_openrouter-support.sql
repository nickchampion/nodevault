ALTER TABLE "nodevault"."accounts" ADD COLUMN "openrouter_api_key" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "openrouter_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nodevault"."conversations" ADD COLUMN "model" text;