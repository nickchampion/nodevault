import { serverConfiguration } from '@platform/components.configuration.server'
import { Redis } from 'ioredis'
import { asError, CacheBase, type CacheGetter, type ICache } from './cache.js'

export class RedisCache extends CacheBase implements ICache {
  cache: Redis | null = null
  errorHandler: (e: Error) => void = e => console.error(e)
  initialisationError = false

  private async initialiseCache(): Promise<Redis | null> {
    const { host, port } = serverConfiguration.redis

    if (!host) return null

    const client = new Redis({
      port,
      host,
      connectTimeout: 5000,
      maxRetriesPerRequest: 3,
      retryStrategy: times => Math.min(times * 30, 1000),
      reconnectOnError: (error) => {
        const targetErrors = [/READONLY/, /ETIMEDOUT/]

        return targetErrors.some(targetError => targetError.test(error.message))
      },
    })

    await new Promise((resolve, reject) => {
      client.on('connect', resolve)
      client.on('error', reject)
    })

    return client
  }

  /**
   * Returns a connected client, or null when redis is not configured or the connection failed.
   * A failed initialisation is remembered so we don't retry on every cache call.
   */
  private async connection(): Promise<Redis | null> {
    if (this.initialisationError) return null

    if (!this.cache) {
      try {
        this.cache = await this.initialiseCache()
      } catch (error) {
        this.errorHandler(asError(error))
        this.initialisationError = true
        return null
      }
    }

    return this.cache
  }

  async set(key: string, data: unknown, ttl?: number): Promise<void> {
    const client = await this.connection()

    if (!client) return

    try {
      const cacheKey = this.composeKey(key)

      await client.set(cacheKey, JSON.stringify(data), 'EX', ttl || serverConfiguration.cache.timeouts.tenMinutes)
    } catch (error) {
      this.errorHandler(asError(error))
    }
  }

  async get<T>(key: string, getter: CacheGetter<T>, ttl?: number): Promise<T | null> {
    const client = await this.connection()

    if (!client) return getter ? await getter() : null

    try {
      const cacheKey = this.composeKey(key)

      const rawValue = await client.get(cacheKey)

      if (rawValue) {
        return JSON.parse(rawValue) as T
      }

      // if we miss call the getter to retreive the data
      const value = getter ? await getter() : null

      if (value) {
        await this.set(key, value, ttl || serverConfiguration.cache.timeouts.tenMinutes)
      }

      return value
    } catch (error) {
      this.errorHandler(asError(error))
      await this.del(key)
      return getter ? await getter() : null
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.connection()

    if (!client) return

    try {
      await client.del(this.composeKey(key))
    } catch (error) {
      this.errorHandler(asError(error))
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    const client = await this.connection()

    if (!client) return

    try {
      const keys = await client.keys(`${prefix}*`)

      // TODO: maybe look at pipelining this https://github.com/luin/ioredis#pipelining
      for (const key of keys) {
        await client.del(key)
      }
    } catch (error) {
      this.errorHandler(asError(error))
    }
  }

  async flush(): Promise<void> {
    const client = await this.connection()

    if (!client) return

    await client.flushdb()
  }

  async cleanup(): Promise<void> {
    const client = await this.connection()

    if (!client) return

    await client.quit()
    this.cache = null
  }

  async keys(prefix: string): Promise<string[]> {
    const client = await this.connection()

    if (!client) return []

    return await client.keys(`${prefix}*`)
  }

  setErrorHandler(errorHandler: (e: Error) => void) {
    this.errorHandler = errorHandler
  }
}
