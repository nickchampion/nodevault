ALTER TABLE "nodevault"."files" RENAME TO "assets";--> statement-breakpoint
ALTER TABLE "nodevault"."file_chunks" RENAME TO "asset_chunks";--> statement-breakpoint
ALTER TABLE "nodevault"."asset_chunks" RENAME COLUMN "file_id" TO "asset_id";--> statement-breakpoint
ALTER SEQUENCE "nodevault"."files_id_seq" RENAME TO "assets_id_seq";--> statement-breakpoint
ALTER SEQUENCE "nodevault"."file_chunks_id_seq" RENAME TO "asset_chunks_id_seq";--> statement-breakpoint
ALTER TABLE "nodevault"."assets" RENAME CONSTRAINT "files_vault_id_vaults_id_fk" TO "assets_vault_id_vaults_id_fk";--> statement-breakpoint
ALTER TABLE "nodevault"."asset_chunks" RENAME CONSTRAINT "file_chunks_file_id_files_id_fk" TO "asset_chunks_asset_id_assets_id_fk";--> statement-breakpoint
ALTER INDEX "nodevault"."files_vault_id_idx" RENAME TO "assets_vault_id_idx";--> statement-breakpoint
ALTER INDEX "nodevault"."file_chunks_file_id_chunk_index_unique" RENAME TO "asset_chunks_asset_id_chunk_index_unique";--> statement-breakpoint
ALTER INDEX "nodevault"."file_chunks_embedding_idx" RENAME TO "asset_chunks_embedding_idx";
