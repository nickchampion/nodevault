export type AppConfig = {
  api: string
  version: string
  environment: string
}

export const appConfig = (): AppConfig => {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev'

  return {
    // eslint-disable-next-line unicorn/prefer-https
    api: environment === 'prod' ? 'https://api.nodevault.cloud' : 'http://api.nodevault.local:8002',
    version: process.env.NEXT_PUBLIC_VERSION || 'dev',
    environment,
  }
}
