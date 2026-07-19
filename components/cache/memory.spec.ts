import type { ICache } from './cache.js'
import { MemoryCache } from './memory.js'

describe('Memory cache', () => {
  let cache: ICache

  beforeEach(() => {
    cache = new MemoryCache()
  })

  it('should cache a simple value', async () => {
    const key = 'test:key'
    const value = 'abc123'

    await cache.set(key, value)

    const cachedValue = await cache.get<string>(key, null)

    expect(cachedValue).toEqual(value)
  })

  it('should cache a complex value', async () => {
    interface ITestCacheValue {
      hello: string
    }

    const key = 'test:key'
    const value = {
      hello: 'world',
    }

    await cache.set(key, value)

    const cachedValue = await cache.get<ITestCacheValue>(key, null)

    expect(cachedValue?.hello).toEqual(value.hello)
    expect(JSON.stringify(cachedValue)).toEqual(JSON.stringify(value))
  })

  it('should delete a simple value by key', async () => {
    const key = 'test:key'
    const value = 'abc123'

    await cache.set(key, value)
    await cache.del(key)

    const cachedValue = await cache.get<string>(key, null)

    expect(cachedValue).toBeNull()
  })

  it('should delete all key values', async () => {
    const keys = [
      {
        key: 'test:key:1',
        value: 'testkey1',
      },
      {
        key: 'test:key:2',
        value: 'testkey2',
      },
      {
        key: 'test:key:3',
        value: 'testkey3',
      },
    ]

    for (const k of keys) {
      await cache.set(k.key, k.value)
    }

    await cache.flush()

    for (const k of keys) {
      const cachedValue = await cache.get(k.key, null)

      expect(cachedValue).toBeNull()
    }
  })
})
