import { sql } from 'drizzle-orm'
import {
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { UserRole } from '@platform/components.nodevault.contracts'

export type AccountStatus = 'active' | 'deleted'
export type UserStatus = 'active' | 'deleted'

export const nodevault = pgSchema('nodevault')

export const accounts = nodevault.table('accounts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  status: text('status').$type<AccountStatus>().notNull().default('active'),
  // bring-your-own-GCP: every account supplies its own Google Cloud project — the
  // service-account key is encrypted at rest and only decrypted server-side when a
  // Gemini/Vertex client is built for this account
  gcpProjectId: text('gcp_project_id'),
  gcpLocation: text('gcp_location'),
  gcpCredentials: text('gcp_credentials'),
  gcpVerifiedAtUTC: timestamp('gcp_verified_at', { withTimezone: true, mode: 'date' }),
  createdAtUTC: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAtUTC: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export const users = nodevault.table('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
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
