import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import Redis from 'ioredis'
import { isInt } from 'neo4j-driver'

import CONFIG from '@config/index'
import ocelotLogger from '@src/logger'

import type { RedisOptions } from 'ioredis'

// Memoised: callers MUST share the same instance so that publishers and
// subscribers (e.g. policy.changed) reach each other. Returning a fresh
// PubSub on every call silently breaks in-process subscriptions in dev
// (without Redis); with Redis it would work because both clients hit the
// same broker, but consistency across environments is worth the singleton.
let instance: PubSub | RedisPubSub | undefined

// Far above what a publish takes, even from a pod under CPU pressure: running into it loses a live
// event, while it only ever costs time when Redis is gone anyway.
const PUBLISH_TIMEOUT_MS = 2_000

// An event crosses Redis as JSON, while the in-process PubSub hands on the object itself. A Neo4j
// integer does not survive that: it arrives as `{ low, high }`, which no Int field can serialize.
const serializer = (event: unknown) =>
  JSON.stringify(event, (_key, value: unknown) => (isInt(value) ? value.toNumber() : value))

export default () => {
  if (instance) {
    return instance
  }

  const { REDIS_DOMAIN, REDIS_PORT, REDIS_PASSWORD } = CONFIG
  if (!(REDIS_DOMAIN && REDIS_PORT && REDIS_PASSWORD)) {
    instance = new PubSub()
    return instance
  }

  // Deployment note: from ioredis 6 the client negotiates RESP3 through HELLO, and a server that
  // does not know that command is a hard failure rather than a downgrade — so whoever first runs
  // this against a real broker needs Redis 6.0 or newer. Nothing else here changes with it: reply
  // shapes stay RESP2-compatible (ioredis' `replyMapping` default) and the pub/sub surface used
  // by graphql-redis-subscriptions is the same under either protocol.
  const options: RedisOptions = {
    host: REDIS_DOMAIN,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000)
    },
  }
  const onError = (error: Error) => {
    ocelotLogger.warn('Redis connection failed', error.message)
  }
  // No queue for a publisher, and no second try: what happens while Redis is away is lost either
  // way, and a mutation awaiting publish() would sit through every retry first, for an answer
  // nobody needs. The timeout is for a Redis that stopped answering without closing the socket.
  const publisher = new Redis({
    ...options,
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false,
    commandTimeout: PUBLISH_TIMEOUT_MS,
  }).on('error', onError)
  // No limit for a subscriber: it waits for Redis, however long that takes. Giving up would throw
  // out of init() at boot, and out of an open subscription later on.
  const subscriber = new Redis({ ...options, maxRetriesPerRequest: null }).on('error', onError)
  const pubsub = new RedisPubSub({ publisher, subscriber, serializer })

  // Most callers `void` their publish() because the write has committed and the event is a
  // courtesy, so a rejection from here would go unhandled and take the whole process down with it.
  const publish = pubsub.publish.bind(pubsub)
  pubsub.publish = async (trigger, payload) => {
    try {
      await publish(trigger, payload)
      // eslint-disable-next-line no-catch-all/no-catch-all -- see above: nothing may escape
    } catch (error) {
      ocelotLogger.warn(`Could not publish ${trigger}`, error)
    }
  }
  instance = pubsub
  return instance
}
