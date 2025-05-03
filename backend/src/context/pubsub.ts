/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import Redis from 'ioredis'

import CONFIG from '@config/index'

export default () => {
  if (!CONFIG.REDIS_DOMAIN || CONFIG.REDIS_PORT || CONFIG.REDIS_PASSWORD) {
    return new PubSub()
  }

  const options = {
    host: CONFIG.REDIS_DOMAIN,
    port: CONFIG.REDIS_PORT,
    password: CONFIG.REDIS_PASSWORD,
    retryStrategy: (times) => {
      return Math.min(times * 50, 2000)
    },
  }
  return new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  })
}
