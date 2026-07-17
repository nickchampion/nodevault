CREATE TABLE "nodevault"."file_chunks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodevault"."file_chunks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodevault"."file_chunks" ADD CONSTRAINT "file_chunks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "nodevault"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_chunks_file_id_chunk_index_unique" ON "nodevault"."file_chunks" USING btree ("file_id","chunk_index");--> statement-breakpoint
CREATE INDEX "file_chunks_embedding_idx" ON "nodevault"."file_chunks" USING hnsw ("embedding" vector_cosine_ops);