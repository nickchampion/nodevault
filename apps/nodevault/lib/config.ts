export type AppConfig = {
  api: string
  version: string
  environment: string
}

export const appConfig = (): AppConfig => {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev'

  return {
    api: environment === 'prod' ? 'https://api.nodevault.cloud' : 'https://api.nodevault.local:9002',
    version: process.env.NEXT_PUBLIC_VERSION || 'dev',
    environment,
  }
}
