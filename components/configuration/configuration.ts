/* eslint-disable unicorn/prefer-https */
import type { EnvironmentSettings } from '@platform/components.configuration'

export type ServerConfiguration = {
  production: boolean
  dev: boolean
  api: string
  app: string
  origins: string[]
  environment: EnvironmentSettings
  version: string
  neon: Neon
  cloudflare: Cloudflare
  gemini: {
    apiKey: string
  }
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

export type Neon = {
  url: string
  urlUnpooled: string
  branch: string
  poolSize: number
}

export type Cloudflare = {
  accountId: string
  apiKey: string
  r2: {
    bucket: string
  }
}

export const server = {
  dev: {
    default: true,
    prod: false,
  },
  origins: {
    default: ['http://www.nodevault.local:8001'],
    prod: ['https://www.nodevault.cloud'],
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
    default: 'http://api.nodevault.local:8002',
    prod: 'https://api.nodevault.cloud',
  },
  app: {
    default: 'http://www.nodevault.local:8001',
    prod: 'https://www.nodevault.cloud',
  },
  neon: {
    url: {
      encrypted: true,
      default: '0489dLDFmT1IDQXuhbYQw7IfAUB1EuhMDdZLuCz8gIOmeQ2fMqtRMjov6qY5POoBLj/khf2h1YMaJvxNh1lF5B8=',
      prod: 'wO8ajY6fov8fDrmHvrXwD3jCB7ff8XaQhPEPDzISQVvvBwE/M6y/A8rRXaeMLTGmFRnJaOgcHrpOmJH0QUMheUP48poOsFLs48mUIXR1P8Zp9Ebgy1NrOQHbI/r50I2uRgMGBoCKFARqUxnLr8Q/fIuahaJ3g08fiV/gtOg4nHcd1YCGJqS8gj8gYSUzv36l6FM7zniL+qIw3JX1io8qVkU=',
    },
    urlUnpooled: {
      encrypted: true,
      default: '0489dLDFmT1IDQXuhbYQw7IfAUB1EuhMDdZLuCz8gIOmeQ2fMqtRMjov6qY5POoBLj/khf2h1YMaJvxNh1lF5B8=',
      prod: 'Iuki5D0qjpGGSvIbwpAqquoL2lGIjFABoPiCK+UHhb8y49AUXp3ACCYdFmDOkGw+Kyv7sSxhbZ0KTxeWrgEtymLugS2IphYY87wMq68dKKlRdfJSz232mgDJdhsakrtUInvjHGeEzEpOxKnzMT2dPUdBhV9PNiWZ2SBIaFqhzdGucPnmmZOsftELSDRdsJDhgV/QlbrTotSMAg==',
    },
    branch: 'production',
    poolSize: 5,
  },
  cloudflare: {
    accountId: '6588d1ee1643e6a11baba75c0cbea29e',
    apiKey: {
      default: 'zshhB3CwntGNBdMigHIC3eleLw33laknTfZ0+3aS8jEwciTVZDNaaJCd90mWCbkbs6LpcPXVNPDokgSoz5ou',
      prod: 'C5hRCGX0iUDF6fbZLUCcCZlEgPmyjM+VSJXwe8PsdYEHF2/leyn+6RgfE7ht1SMtfY2uW83/tXj2rdfNmMSK',
      encrypted: true,
    },
    r2: {
      bucket: {
        default: 'nodevault-dev',
        prod: 'nodevault',
      },
    },
  },
  gemini: {
    // placeholders — encrypt a real Gemini API key for each environment (decrypts to null until then)
    apiKey: {
      default: 'REPLACE_ME_ENCRYPTED',
      prod: 'REPLACE_ME_ENCRYPTED',
      encrypted: true,
    },
  },
  resend: {
    apiKey: {
      default: 'sz73qZnpYpqSEBMh2k7C7ejft5SGXRSP6QVaytFe2BbKy6+sp/e3hqtzPqRdKQ==',
      prod: 'SiDNd6gFBH0HP4T/XRDYyrFyC5olQWIH3n1rnvMprd9b2ZRrr7SdMMm8REvB0Q==',
      encrypted: true,
    },
    from: 'nodevault <nodevault@nodevault.cloud>',
    contact: 'hello@nodevault.cloud',
  },
}
