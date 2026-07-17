import type { EnvironmentSettings } from '@platform/components.configuration'

export type ServerConfiguration = {
  production: boolean
  dev: boolean
  api: string
  app: string
  origins: string[]
  environment: EnvironmentSettings
  version: string
  postgres: Postgres
  cloudflare: Cloudflare
  resend: {
    apiKey: string
    from: string
    contact: string
  }
}

export type BasicAuth = {
  username: string
  password: string
  secret: string
}

export type Postgres = {

  /** Connection string, e.g. postgres://user:pass@host:5432/db */
  url: string

  /** Maximum pool size per process */
  poolSize: number
}

export type Cloudflare = {
  accountId: string
  apiKey: string
}

export const server = {
  dev: {
    default: true,
    prod: false,
  },
  origins: {
    default: ['https://www.nodevault.local:9001', 'https://www.nickchampion.local:9003'],
    prod: ['https://www.nodevault.cloud', 'https://www.nickchampion.me'],
  },
  production: {
    default: false,
    prod: true,
  },
  version: {
    default: 'dev',
    prod: 'env$NODEVAULT_VERSION',
  },
  api: {
    default: 'https://api.nodevault.local:9002',
    prod: 'https://api.nodevault.cloud',
  },
  app: {
    default: 'https://www.nodevault.local:9001',
    prod: 'https://www.nodevault.cloud',
  },
  postgres: {
    url: {
      default: 'postgres://nodevault:nodevault@localhost:5432/nodevault',
      prod: 'env$DATABASE_URL',
    },
    poolSize: 10,
  },
  cloudflare: {
    accountId: '6588d1ee1643e6a11baba75c0cbea29e',
    apiKey: {
      default: 'zshhB3CwntGNBdMigHIC3eleLw33laknTfZ0+3aS8jEwciTVZDNaaJCd90mWCbkbs6LpcPXVNPDokgSoz5ou',
      prod: 'C5hRCGX0iUDF6fbZLUCcCZlEgPmyjM+VSJXwe8PsdYEHF2/leyn+6RgfE7ht1SMtfY2uW83/tXj2rdfNmMSK',
      encrypted: true,
    },
  },
  resend: {
    apiKey: {
      default: 'sz73qZnpYpqSEBMh2k7C7ejft5SGXRSP6QVaytFe2BbKy6+sp/e3hqtzPqRdKQ==',
      prod: 'SiDNd6gFBH0HP4T/XRDYyrFyC5olQWIH3n1rnvMprd9b2ZRrr7SdMMm8REvB0Q==',
      encrypted: true,
    },
    from: 'nodevault <nodevault@nickchampion.me>',
    contact: 'mail@nickchampion.me',
  },
}
