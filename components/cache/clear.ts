import { cache } from './index.js'

export class CacheNotification {
  keys: string[] = []
  prefixes: string[] = []
  flush: boolean
  secrets: boolean = false

  constructor(keys: string[], prefixes: string[], flush: boolean = false, secrets: boolean = false) {
    this.flush = flush
    this.keys = keys
    this.prefixes = prefixes
    this.secrets = secrets
  }
}

const clear = async (cacheNotification: CacheNotification): Promise<void> => {
  if (cacheNotification.flush) {
    await cache.flush()
    return
  }

  if (cacheNotification.prefixes) {
    for (const prefix of cacheNotification.prefixes) {
      await cache.delByPrefix(prefix)
    }
  }

  if (cacheNotification.keys) {
    for (const key of cacheNotification.keys) {
      await cache.del(key)
    }
  }
}

export default clear
