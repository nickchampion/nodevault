import { serverConfiguration } from '@platform/components.configuration.server'

export type CacheGetter<T> = (() => Promise<T | null> | null) | null

export interface ICache {
  set: (key: string, data: unknown, ttl?: number) => Promise<void>
  get: <T>(key: string, getter: CacheGetter<T>, ttl?: number, mttl?: number) => Promise<T | null>
  del: (key: string) => Promise<void>
  delByPrefix: (keyPrefix: string) => Promise<void>
  flush: () => Promise<void>
  cleanup: () => Promise<void>
  setErrorHandler: (errorHandler: (e: Error) => void) => void
  keys: (prefix: string) => Promise<string[]>
  prefix: string
}

export const asError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)))

export abstract class CacheBase {
  prefix: string

  constructor() {
    this.prefix = `nodevault:${serverConfiguration.environment.environment}:`
  }

  protected composeKey(key: string) {
    return `${this.prefix}${key}`.toLowerCase()
  }
}
