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
    apiKey: {
      default: '8npeuu4m/z2ftg+m5czAt9DOCYbecxNf2kmpc4YnaZlBIcMpM2/0RqSFOC7iYNND2iiTykykkj3FQCo//0z7',
      prod: 'RrfURIcSa7NE7fPYNgISDkpNVsgaaMRcd3MPFqL2KkHckC0yQbX+BXqCR9yXwYRbGp4OeauZ5g80SaMNaAdG',
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
