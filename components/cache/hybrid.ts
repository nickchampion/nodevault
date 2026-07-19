import { serverConfiguration } from '@platform/components.configuration.server'
import { CacheBase, type CacheGetter, type ICache } from './cache.js'
import { MemoryCache } from './memory.js'
import { RedisCache } from './redis.js'

/**
 * Hybrid cache uses Redis as the main cache engine, but also caches in memory for a very short period of time (default 2 mins)
 */
export class HybridCache extends CacheBase implements ICache {
  redis: RedisCache
  memory: MemoryCache

  constructor(redis: RedisCache, memory: MemoryCache) {
    super()
    this.redis = redis
    this.memory = memory
  }

  async set(key: string, data: unknown, ttl?: number, mttl?: number): Promise<void> {
    await this.memory.set(key, data, mttl ?? serverConfiguration.cache.timeouts.twoMinutes)
    await this.redis.set(key, data, ttl ?? serverConfiguration.cache.timeouts.tenMinutes)
  }

  async get<T>(key: string, getter: CacheGetter<T>, ttl?: number, mttl?: number): Promise<T | null> {
    // try and get from memory cache, if we find it just return, dont pass the getter as we want redis to get if its not in redis
    let value = await this.memory.get<T>(key, null)

    if (value) return value

    // if its not in memory try redis, pass the getter this time so we cache it if its not cached
    value = await this.redis.get<T>(key, getter, ttl)

    if (value) {
      // if its in redis add it to the memory cache but only for 2 mins
      await this.memory.set(key, value, mttl ?? serverConfiguration.cache.timeouts.twoMinutes)
      return value
    }

    // if we failed to get the value from any cache fall back to the getter
    return getter ? await getter() : null
  }

  async del(key: string): Promise<void> {
    await this.memory.del(key)
    await this.redis.del(key)
  }

  async delByPrefix(prefix: string): Promise<void> {
    await this.memory.delByPrefix(prefix)
    await this.redis.delByPrefix(prefix)
  }

  async flush(): Promise<void> {
    await this.memory.flush()
    await this.redis.flush()
  }

  async cleanup(): Promise<void> {
    await this.memory.cleanup()
    await this.redis.cleanup()
  }

  async keys(prefix: string): Promise<string[]> {
    return await this.redis.keys(prefix)
  }

  setErrorHandler(errorHandler: (e: Error) => void) {
    this.redis.setErrorHandler(errorHandler)
    this.memory.setErrorHandler(errorHandler)
  }
}
