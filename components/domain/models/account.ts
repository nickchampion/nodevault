import { sql } from 'drizzle-orm'
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { Phone, UserRole } from '@platform/components.contracts'

export type AccountStatus = 'active' | 'deleted'
export type UserStatus = 'active' | 'deleted'

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').$type<AccountStatus>().notNull().default('active'),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: jsonb('phone').$type<Phone>(),
  status: text('status').$type<UserStatus>().notNull().default('active'),
  roles: text('roles').array().$type<UserRole[]>().notNull()
    .default(['user']),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, table => [
  uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
])

export type Account = typeof accounts.$inferSelect
export type User = typeof users.$inferSelect
