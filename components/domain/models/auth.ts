import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './account.js'

export const loginTokens = pgTable('login_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  used: boolean('used').notNull().default(false),
  expiresAtUTC: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export type LoginToken = typeof loginTokens.$inferSelect
