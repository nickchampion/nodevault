import type { ICache } from './cache.js'
import { RedisCache } from './redis.js'

describe('Redis cache fails gracefully', () => {
  let cache: ICache

  beforeEach(() => {
    cache = new RedisCache()
  })

  it('Does not error when invalid connection information is provided', async () => {
    const set = async () => {
      await cache.set('test', 'this')
    }

    const get = async () => {
      await cache.get('test', () => null)
    }

    expect(set).not.toThrow()
    expect(get).not.toThrow()

    const value = await cache.get('test-two', async () => ({
      name: 'bob',
    }))

    expect(value?.name).toBe('bob')
  })
})
