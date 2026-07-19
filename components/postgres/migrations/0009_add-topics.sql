CREATE TABLE "nodevault"."topic_matches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodevault"."topic_matches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"topic_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"chunk_id" integer NOT NULL,
	"similarity" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodevault"."topics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodevault"."topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"topic" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodevault"."topic_matches" ADD CONSTRAINT "topic_matches_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "nodevault"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodevault"."topic_matches" ADD CONSTRAINT "topic_matches_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "nodevault"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodevault"."topic_matches" ADD CONSTRAINT "topic_matches_chunk_id_asset_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "nodevault"."asset_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodevault"."topics" ADD CONSTRAINT "topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nodevault"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_matches_topic_id_asset_id_unique" ON "nodevault"."topic_matches" USING btree ("topic_id","asset_id");--> statement-breakpoint
CREATE INDEX "topics_user_id_idx" ON "nodevault"."topics" USING btree ("user_id");