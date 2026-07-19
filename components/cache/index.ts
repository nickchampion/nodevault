import { type CacheEngines, serverConfiguration } from '@platform/components.configuration.server'
import type { ICache } from './cache.js'
import clear from './clear.js'
import { HybridCache } from './hybrid.js'
import { MemoryCache } from './memory.js'
import { RedisCache } from './redis.js'

export const createCacheEngine = (engine: CacheEngines): ICache => {
  // Force memory cache when running in a test.
  if (process.env.VITEST) {
    engine = 'memory'
  }

  switch (engine) {
    case 'memory': {
      return new MemoryCache()
    }

    case 'redis': {
      return new RedisCache()
    }

    case 'hybrid': {
      return new HybridCache(new RedisCache(), new MemoryCache())
    }

    default: {
      throw new Error('Unsupported cache engine')
    }
  }
}

export { type CacheGetter, type ICache } from './cache.js'

export const cache: ICache = createCacheEngine(serverConfiguration.cache.engine)
export const clearCache = clear
