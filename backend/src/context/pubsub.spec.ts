import { jest } from '@jest/globals'

import type { RedisOptions } from 'ioredis'

const mockConfig: {
  REDIS_DOMAIN?: string
  REDIS_PORT?: number
  REDIS_PASSWORD?: string
} = {}

jest.unstable_mockModule('@config/index', () => ({
  __esModule: true,
  get default() {
    return mockConfig
  },
}))

jest.unstable_mockModule('ioredis', () => ({
  __esModule: true,
  // named, not default: pubsub.ts imports `{ Redis }` — ioredis' CommonJS entry has no real
  // default export, so under ESM a default import would be the module namespace.
  Redis: jest.fn(),
}))

jest.unstable_mockModule('graphql-redis-subscriptions', () => ({
  __esModule: true,
  RedisPubSub: jest.fn(),
}))

// The module memoises its client in module scope, so every case needs a fresh registry. The
// mocked modules are re-imported alongside it: after resetModules the module under test binds
// to NEW mock instances, and a binding captured at the top of this file would be a different
// object (which is also why `PubSub` is pulled in here rather than imported above — otherwise
// `toBeInstanceOf` compares against a class from the discarded registry).
const load = async () => {
  jest.resetModules()
  const [pubsubModule, ioredis, redisSubscriptions, subscriptions] = await Promise.all([
    import('./pubsub'),
    import('ioredis'),
    import('graphql-redis-subscriptions'),
    import('graphql-subscriptions'),
  ])
  return {
    pubsub: pubsubModule.default,
    Redis: jest.mocked(ioredis.Redis),
    RedisPubSub: jest.mocked(redisSubscriptions.RedisPubSub),
    PubSub: subscriptions.PubSub,
  }
}

const configureRedis = () => {
  mockConfig.REDIS_DOMAIN = 'redis.example.test'
  mockConfig.REDIS_PORT = 6379
  mockConfig.REDIS_PASSWORD = 'sesame'
}

// The options object handed to `new Redis(...)`, as the first call received it.
const redisOptions = (Redis: { mock: { calls: unknown[][] } }): RedisOptions =>
  Redis.mock.calls[0][0] as RedisOptions

beforeEach(() => {
  mockConfig.REDIS_DOMAIN = undefined
  mockConfig.REDIS_PORT = undefined
  mockConfig.REDIS_PASSWORD = undefined
})

describe('without Redis configured', () => {
  it('falls back to the in-process PubSub', async () => {
    const { pubsub, PubSub, RedisPubSub } = await load()
    expect(pubsub()).toBeInstanceOf(PubSub)
    expect(RedisPubSub).not.toHaveBeenCalled()
  })

  it.each([
    ['REDIS_DOMAIN', () => (mockConfig.REDIS_DOMAIN = undefined)],
    ['REDIS_PORT', () => (mockConfig.REDIS_PORT = undefined)],
    ['REDIS_PASSWORD', () => (mockConfig.REDIS_PASSWORD = undefined)],
  ])(
    'falls back when only %s is missing — a half-configured broker is not used',
    async (_name, unset) => {
      configureRedis()
      unset()
      const { pubsub, PubSub, RedisPubSub } = await load()
      expect(pubsub()).toBeInstanceOf(PubSub)
      expect(RedisPubSub).not.toHaveBeenCalled()
    },
  )

  it('memoises, so publishers and subscribers share one instance', async () => {
    const { pubsub } = await load()
    expect(pubsub()).toBe(pubsub())
  })
})

describe('with Redis configured', () => {
  beforeEach(configureRedis)

  it('gives RedisPubSub a dedicated publisher and subscriber', async () => {
    const { pubsub, Redis, RedisPubSub } = await load()
    pubsub()
    // Two clients, not one: a connection in subscriber mode cannot publish.
    expect(Redis).toHaveBeenCalledTimes(2)
    expect(RedisPubSub).toHaveBeenCalledTimes(1)
    const { publisher, subscriber } = (RedisPubSub.mock.calls[0] as [Record<string, unknown>])[0]
    expect(publisher).not.toBe(subscriber)
  })

  it('passes host, port and password through', async () => {
    const { pubsub, Redis } = await load()
    pubsub()
    expect(redisOptions(Redis)).toMatchObject({
      host: 'redis.example.test',
      port: 6379,
      password: 'sesame',
    })
  })

  it('backs off linearly and caps the retry delay at two seconds', async () => {
    const { pubsub, Redis } = await load()
    pubsub()
    const { retryStrategy } = redisOptions(Redis)
    expect(retryStrategy).toBeDefined()
    expect(retryStrategy?.(1)).toBe(50)
    expect(retryStrategy?.(10)).toBe(500)
    expect(retryStrategy?.(40)).toBe(2000)
    expect(retryStrategy?.(1000)).toBe(2000)
  })

  it('memoises across calls', async () => {
    const { pubsub, RedisPubSub } = await load()
    expect(pubsub()).toBe(pubsub())
    expect(RedisPubSub).toHaveBeenCalledTimes(1)
  })
})
