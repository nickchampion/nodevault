import {
  doublePrecision,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core'
import { assetChunks, assets } from './vault.js'
import { nodevault, users } from './account.js'

export type TopicStatus = 'pending' | 'ready' | 'failed'

export const topics = nodevault.table('topics', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  status: text('status').$type<TopicStatus>().notNull().default('pending'),
  error: text('error'),
  // set by the embed-topic workflow once the topic text has been embedded
  embedding: vector('embedding', { dimensions: 768 }),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  index('topics_user_id_idx').on(table.userId),
])

export const topicMatches = nodevault.table('topic_matches', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  chunkId: integer('chunk_id').notNull().references(() => assetChunks.id, { onDelete: 'cascade' }),
  similarity: doublePrecision('similarity').notNull(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  // the idempotency guard: a topic only ever alerts once per asset, no matter how many
  // of the asset's chunks clear the match threshold or how many times the workflow retries
  uniqueIndex('topic_matches_topic_id_asset_id_unique').on(table.topicId, table.assetId),
])

export type Topic = typeof topics.$inferSelect
export type TopicMatch = typeof topicMatches.$inferSelect
