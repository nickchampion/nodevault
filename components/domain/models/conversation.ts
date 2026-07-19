import {
  index, integer, jsonb, text, timestamp,
} from 'drizzle-orm/pg-core'
import type { CitationDto, ConversationRole } from '@platform/components.contracts'
import { nodevault } from './account.js'
import { vaults } from './vault.js'

export const conversations = nodevault.table('conversations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  vaultId: integer('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  index('conversations_vault_id_idx').on(table.vaultId),
])

export const conversationMessages = nodevault.table('conversation_messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').$type<ConversationRole>().notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations').$type<CitationDto[]>(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  index('conversation_messages_conversation_id_idx').on(table.conversationId),
])

export type Conversation = typeof conversations.$inferSelect
export type ConversationMessage = typeof conversationMessages.$inferSelect
