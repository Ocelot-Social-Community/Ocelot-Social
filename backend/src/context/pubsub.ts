import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import Redis from 'ioredis'

import CONFIG from '@config/index'

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

  const options = {
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
