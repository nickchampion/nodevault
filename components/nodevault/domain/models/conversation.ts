import {
  index, integer, jsonb, text, timestamp,
} from 'drizzle-orm/pg-core'
import type { AskMode, CitationDto, ConversationRole } from '@platform/components.nodevault.contracts'
import { nodevault } from './account.js'
import { vaults } from './vault.js'

export const conversations = nodevault.table('conversations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  vaultId: integer('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  // the retrieval stack the conversation was created in — used to reopen it on the right
  // Q&A tab in the search UI. Existing rows default to the hand-rolled 'local' pipeline.
  mode: text('mode').$type<AskMode>().notNull().default('local'),
  // the OpenRouter model that answered this conversation (mode === 'openrouter'); null for
  // local/managed modes which use the account's base provider. Restores the model on reopen.
  model: text('model'),
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
