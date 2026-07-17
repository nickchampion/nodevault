export type Environment = 'dev' | 'prod'

export interface EnvironmentSettings {
  key: string
  salt: string
  environment: Environment
}
