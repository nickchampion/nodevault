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
  postgres: Postgres
  cloudflare: Cloudflare
  gemini: {
    project: string
    location: string
    credentials: string
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

export type Postgres = {
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
  postgres: {
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
      default: 'GDxYovRqsnLeockFR/PFfkN7caPSw0G5ylsgdntvb/CmsK53eHUQCCb5pdtrHbgV8MhCd8s4b5POa3mUL97C',
      prod: 'eyDwkGdWc4tiApsrihMqEwquZV7HDTQe2/tIgE6C/xdihqf2+TNnlNOdQjiQW0NM/FzSL5pfTthqXnyrarKU',
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
    project: 'nodevault-502719',
    location: 'europe-west2',
    credentials: {
      encrypted: true,
      default: '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',
      prod: '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',
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
