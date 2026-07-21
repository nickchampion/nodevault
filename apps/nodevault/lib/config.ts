/* eslint-disable unicorn/prefer-https */
import { build, type Environment, type EnvironmentSettings } from '@platform/components.configuration'

export type AppConfig = {
  api: string
  app: string
  version: string
  environment: Environment
}

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
