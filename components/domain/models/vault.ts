import type { SQL } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core'
import { accounts, nodevault } from './account.js'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export type AssetSource = 'file' | 'url'
export type AssetStatus = 'pending' | 'processing' | 'ready' | 'failed'

export const vaults = nodevault.table('vaults', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  name: text('name').notNull(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  index('vaults_account_id_idx').on(table.accountId),
  uniqueIndex('vaults_account_id_name_unique').on(table.accountId, sql`lower(${table.name})`),
])

export const assets = nodevault.table('assets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  vaultId: integer('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  source: text('source').$type<AssetSource>().notNull(),
  // display name: original filename for uploads, resolved page title for scrapes
  name: text('name'),
  url: text('url'),
  // R2 object key for uploads; null for scraped URLs
  storageKey: text('storage_key'),
  contentType: text('content_type'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  status: text('status').$type<AssetStatus>().notNull().default('pending'),
  error: text('error'),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  index('assets_vault_id_idx').on(table.vaultId),
])

export const assetChunks = nodevault.table('asset_chunks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  text: text('text').notNull(),
  // null until the embedding workflow step has processed the chunk
  embedding: vector('embedding', { dimensions: 768 }),
  // generated from `text` for Postgres full-text search — catches exact names/codes/acronyms that embeddings blur
  searchVector: tsvector('search_vector').notNull().generatedAlwaysAs(
    (): SQL => sql`to_tsvector('english', ${assetChunks.text})`,
  ),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  uniqueIndex('asset_chunks_asset_id_chunk_index_unique').on(table.assetId, table.chunkIndex),
  index('asset_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  index('asset_chunks_search_vector_idx').using('gin', table.searchVector),
])

export type Vault = typeof vaults.$inferSelect
export type VaultAsset = typeof assets.$inferSelect
export type AssetChunk = typeof assetChunks.$inferSelect
