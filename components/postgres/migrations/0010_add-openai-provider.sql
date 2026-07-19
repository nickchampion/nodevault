ALTER TABLE "nodevault"."accounts" ADD COLUMN "ai_provider" text DEFAULT 'gemini' NOT NULL;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "openai_api_key" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "openai_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "openai_vector_store_id" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "openai_migrating_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nodevault"."assets" ADD COLUMN "openai_file_id" text;