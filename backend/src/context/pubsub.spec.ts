import { beforeEach, describe, it, expect } from 'vitest'

import type { RedisOptions } from 'ioredis'
import type { Mock } from 'vitest'

interface MockRedisConfig {
  REDIS_DOMAIN?: string
  REDIS_PORT?: number
  REDIS_PASSWORD?: string
}

// `vi.hoisted` lifts the object to where the (hoisted) mock factory can see it. The Jest version
// reached the same end through a getter, which only existed to dodge the TDZ its hoisting caused.
const { mockConfig, mockPublish, mockWarn } = vi.hoisted(
  (): {
    mockConfig: MockRedisConfig
    mockPublish: Mock<(trigger: string, payload: unknown) => Promise<void>>
    mockWarn: Mock
  } => ({ mockConfig: {}, mockPublish: vi.fn(), mockWarn: vi.fn() }),
)

vi.mock('@config/index', () => ({ __esModule: true, default: mockConfig }))

vi.mock('@src/logger', () => ({ default: { warn: mockWarn } }))

// `function`, not arrows: both stand in for classes the code under test calls with `new`.
vi.mock('ioredis', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(function (this: { on: unknown }) {
    this.on = vi.fn().mockReturnValue(this)
  }),
}))

vi.mock('graphql-redis-subscriptions', () => ({
  __esModule: true,
  RedisPubSub: vi.fn().mockImplementation(function (this: { publish: unknown }) {
    this.publish = mockPublish
  }),
}))

// The module memoises its client in module scope, so every case needs a fresh registry. The
// mocked modules are re-imported alongside it: after resetModules the module under test binds
// to NEW mock instances, and a binding captured at the top of this file would be a different
// object (which is also why `PubSub` is pulled in here rather than imported above — otherwise
// `toBeInstanceOf` compares against a class from the discarded registry).
const load = async () => {
  vi.resetModules()
  // Sequential, not Promise.all: the mocked modules have to be resolved before the module under
  // test evaluates and captures its bindings.
  const ioredis = await import('ioredis')
  const redisSubscriptions = await import('graphql-redis-subscriptions')
  const subscriptions = await import('graphql-subscriptions')
  const pubsubModule = await import('./pubsub')
  return {
    pubsub: pubsubModule.default,
    Redis: vi.mocked(ioredis.default),
    RedisPubSub: vi.mocked(redisSubscriptions.RedisPubSub),
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
  // vitest evaluates a mock factory once and reuses the result, so call counts survive across
  // tests — under Jest each resetModules produced fresh mock instances.
  vi.clearAllMocks()
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

  it('never queues a publish, and never gives up on a subscription', async () => {
    const { pubsub, Redis } = await load()
    pubsub()
    const [publisherOptions, subscriberOptions] = (Redis.mock.calls as unknown[][]).map(
      ([options]) => options as RedisOptions,
    )

    expect(publisherOptions).toMatchObject({ enableOfflineQueue: false })
    expect(subscriberOptions).toMatchObject({ maxRetriesPerRequest: null })
  })

  it('logs a connection error instead of leaving it unhandled', async () => {
    const { pubsub, Redis } = await load()
    pubsub()
    const [client] = Redis.mock.instances as unknown as { on: ReturnType<typeof vi.fn> }[]
    const [event, onError] = client.on.mock.calls[0] as [string, (error: Error) => void]

    onError(new Error('connection refused'))

    expect(event).toBe('error')
    expect(mockWarn).toHaveBeenCalledWith(expect.any(String), 'connection refused')
  })

  it('hands a publish on to Redis', async () => {
    const { pubsub } = await load()
    mockPublish.mockResolvedValueOnce()

    await pubsub().publish('CHANNEL', { id: 1 })

    expect(mockPublish).toHaveBeenCalledWith('CHANNEL', { id: 1 })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  // Most callers `void` their publish: a rejection here would end the process.
  it('swallows a failed publish, and says so', async () => {
    const { pubsub } = await load()
    const error = new Error('Stream is not writeable')
    mockPublish.mockRejectedValueOnce(error)

    await expect(pubsub().publish('CHANNEL', {})).resolves.toBeUndefined()

    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('CHANNEL'), error)
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
