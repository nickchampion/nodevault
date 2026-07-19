import NodeCache from 'node-cache'
import { serverConfiguration } from '@platform/components.configuration.server'
import { CacheBase, type CacheGetter, type ICache } from './cache.js'

export class MemoryCache extends CacheBase implements ICache {
  cache: NodeCache
  errorHandler: (e: Error) => void = e => console.error(e)

  constructor() {
    super()
    this.cache = new NodeCache({
      stdTTL: serverConfiguration.cache.timeouts.tenMinutes,
      checkperiod: 120,
      useClones: true,
      deleteOnExpire: true,
    })
  }

  async set(key: string, data: unknown, ttl?: number): Promise<void> {
    if (ttl == 0) return // dont cache if ttl equals 0

    const cacheKey = this.composeKey(key)

    this.cache.set(cacheKey, data, ttl ?? serverConfiguration.cache.timeouts.twoMinutes)
  }

  async get<T>(key: string, getter: CacheGetter<T>, ttl?: number): Promise<T | null> {
    const cacheKey = this.composeKey(key)

    const cached = this.cache.get<T>(cacheKey)

    if (cached) return cached

    // if we miss call the getter to retreive the data
    const value = getter ? await getter() : null

    if (value) {
      await this.set(key, value, ttl || serverConfiguration.cache.timeouts.twoMinutes)
    }

    return value
  }

  async del(key: string): Promise<void> {
    this.cache.del(this.composeKey(key))
  }

  async delByPrefix(prefix: string): Promise<void> {
    this.cache
      .keys()
      .filter(k => k.startsWith(prefix))
      .forEach((k) => {
        this.cache.del(k)
      })
  }

  async flush(): Promise<void> {
    this.cache.flushAll()
  }

  async keys(prefix: string): Promise<string[]> {
    return this.cache.keys().filter(k => (prefix ? k.startsWith(prefix) : true))
  }

  async cleanup(): Promise<void> {
    this.cache.flushAll()
    this.cache.close()
  }

  setErrorHandler(errorHandler: (e: Error) => void) {
    this.errorHandler = errorHandler
  }
}
