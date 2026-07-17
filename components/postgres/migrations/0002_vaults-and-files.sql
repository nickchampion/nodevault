CREATE TABLE "nodevault"."files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodevault"."files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vault_id" integer NOT NULL,
	"source" text NOT NULL,
	"name" text,
	"url" text,
	"storage_key" text,
	"content_type" text,
	"size_bytes" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodevault"."vaults" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodevault"."vaults_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodevault"."files" ADD CONSTRAINT "files_vault_id_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "nodevault"."vaults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodevault"."vaults" ADD CONSTRAINT "vaults_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "nodevault"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_vault_id_idx" ON "nodevault"."files" USING btree ("vault_id");--> statement-breakpoint
CREATE INDEX "vaults_account_id_idx" ON "nodevault"."vaults" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vaults_account_id_name_unique" ON "nodevault"."vaults" USING btree ("account_id",lower("name"));
