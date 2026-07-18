import { defineConfig } from 'drizzle-kit'
import { serverConfiguration } from '@platform/components.configuration.server'

export default defineConfig({
  dialect: 'postgresql',
  schema: './components/domain/models/*.ts',
  out: './components/postgres/migrations',
  dbCredentials: {
    url: serverConfiguration.postgres.urlUnpooled,
  },
})
