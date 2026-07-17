import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './components/domain/models/*.ts',
  out: './components/postgres/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://nodevault:nodevault@localhost:5432/nodevault',
  },
})
