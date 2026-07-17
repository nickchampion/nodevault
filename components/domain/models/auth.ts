import {
  boolean,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { nodevault, users } from './account.js'

export const loginTokens = nodevault.table('login_tokens', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  used: boolean('used').notNull().default(false),
  expiresAtUTC: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export type LoginToken = typeof loginTokens.$inferSelect
