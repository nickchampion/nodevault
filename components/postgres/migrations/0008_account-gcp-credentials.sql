ALTER TABLE "nodevault"."accounts" ADD COLUMN "gcp_project_id" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "gcp_location" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "gcp_credentials" text;--> statement-breakpoint
ALTER TABLE "nodevault"."accounts" ADD COLUMN "gcp_verified_at" timestamp with time zone;