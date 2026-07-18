/* eslint-disable unicorn/prefer-https */
import { build, type Environment, type EnvironmentSettings } from '@platform/components.configuration'

export type AppConfig = {
  api: string
  app: string
  version: string
  environment: Environment
}

// Per-environment baseline, resolved by the same build() used for the API's serverConfiguration —
// see components/configuration/configuration.ts. No secrets here, so no key/salt/decrypt needed.
const client = {
  api: {
    default: 'http://api.nodevault.local:8002',
    prod: 'https://api.nodevault.cloud',
  },
  app: {
    default: 'http://www.nodevault.local:8001',
    prod: 'https://www.nodevault.cloud',
  },
}

export const appConfig = (): AppConfig => {
  // Read as a literal `process.env.NEXT_PUBLIC_*` access (not through build()'s env$ indirection)
  // so Next.js can statically inline it into the client bundle.
  const environment: EnvironmentSettings = {
    environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'dev',
    key: '',
    salt: '',
  }

  return {
    ...build<Omit<AppConfig, 'environment' | 'version'>>(client, environment),
    version: process.env.NEXT_PUBLIC_VERSION || 'dev',
    environment: environment.environment,
  }
}
