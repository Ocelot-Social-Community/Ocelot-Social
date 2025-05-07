import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import Redis from 'ioredis'

import CONFIG from '@config/index'

export default () => {
  const { REDIS_DOMAIN, REDIS_PORT, REDIS_PASSWORD } = CONFIG
  if (!(REDIS_DOMAIN && REDIS_PORT && REDIS_PASSWORD)) {
    return new PubSub()
  }

  const options = {
    host: REDIS_DOMAIN,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000)
    },
  }
  return new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  })
}
