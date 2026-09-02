import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
// Named, not default: ioredis' CommonJS entry has no real default export, so under ESM the
// default import resolves to the module namespace — which is not constructable.
import { Redis } from 'ioredis'

import CONFIG from '@config/index'

import type { RedisOptions } from 'ioredis'

// Memoised: callers MUST share the same instance so that publishers and
// subscribers (e.g. policy.changed) reach each other. Returning a fresh
// PubSub on every call silently breaks in-process subscriptions in dev
// (without Redis); with Redis it would work because both clients hit the
// same broker, but consistency across environments is worth the singleton.
let instance: PubSub | RedisPubSub | undefined

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
  instance = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  })
  return instance
}
