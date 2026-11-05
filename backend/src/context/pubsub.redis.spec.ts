// Two instances of the real pubsub against a real Redis, which is what production runs on and what
// pubsub.spec.ts mocks away. Everything an event carries has to survive the JSON on the way.

import { EventEmitter, once } from 'node:events'

import { int } from 'neo4j-driver'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import CONFIG from '@config/index'

import type { RedisPubSub } from 'graphql-redis-subscriptions'

const redisConfigured = Boolean(CONFIG.REDIS_DOMAIN && CONFIG.REDIS_PORT && CONFIG.REDIS_PASSWORD)

// The module memoises its instance, so a fresh registry is a second backend.
const instance = async () => {
  vi.resetModules()
  const { default: pubsubContext } = await import('./pubsub')
  return pubsubContext() as RedisPubSub
}

describe.runIf(redisConfigured)('pubsub across two instances', () => {
  let writer: RedisPubSub
  let reader: RedisPubSub

  beforeAll(async () => {
    writer = await instance()
    reader = await instance()
    // A publisher has no offline queue: what it is handed before it is connected is dropped.
    // It may well be connected by now, and then 'ready' has come and gone.
    const publisher = writer.getPublisher()
    if (publisher.status !== 'ready') {
      await once(publisher, 'ready')
    }
  })

  afterAll(async () => {
    await Promise.all([writer.close(), reader.close()])
  })

  const roundTrip = async (payload: Record<string, unknown>) => {
    const channel = new EventEmitter()
    const received = once(channel, 'message')
    await reader.subscribe('roundTrip', (message: unknown) => channel.emit('message', message))
    await writer.publish('roundTrip', payload)
    const [message] = (await received) as unknown[]
    return message
  }

  it('reaches the other instance', async () => {
    await expect(roundTrip({ userId: 'u1' })).resolves.toEqual({ userId: 'u1' })
  })

  it('hands on a Neo4j integer as the number the schema can serialize', async () => {
    await expect(
      roundTrip({ to: { id: 'u1', termsAndConditionsAgreedVersion: int(42) } }),
    ).resolves.toEqual({ to: { id: 'u1', termsAndConditionsAgreedVersion: 42 } })
  })
})
