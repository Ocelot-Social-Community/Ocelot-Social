/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// (Factory is untyped; same disable the DB-backed specs use.)

import { EventEmitter, once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'

import { createClient } from 'graphql-ws'
import Redis from 'ioredis'
import { WebSocket } from 'ws'

import CONFIG from '@config/index'
import Factory, { cleanDatabase } from '@db/factories'
import { encode } from '@src/jwt/encode'

import type { Client } from 'graphql-ws'

/* eslint-disable n/no-process-env -- where the two backends are is the runner's business */
export const FIRST = process.env.BACKEND_FIRST ?? 'http://localhost:4000'
export const SECOND = process.env.BACKEND_SECOND ?? 'http://backend-2:4000'
/* eslint-enable n/no-process-env */

const clients: Client[] = []

const redis = new Redis({
  host: CONFIG.REDIS_DOMAIN,
  port: CONFIG.REDIS_PORT,
  password: CONFIG.REDIS_PASSWORD,
  lazyConnect: true,
})

export const closeRedis = () => {
  redis.disconnect()
}

export const closeClients = async () => {
  await Promise.all(clients.splice(0).map(async (client) => client.dispose()))
}

export const eventually = async <T>(read: () => Promise<T>, accept: (value: T) => boolean) => {
  const deadline = Date.now() + 15_000
  let value = await read()
  while (!accept(value) && Date.now() < deadline) {
    await sleep(200)
    value = await read()
  }
  return value
}

export const query = async (
  backend: string,
  document: string,
  { token, variables }: { token?: string; variables?: Record<string, unknown> } = {},
) => {
  const response = await fetch(backend, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: document, variables }),
    signal: AbortSignal.timeout(10_000),
  })
  return (await response.json()) as {
    data?: Record<string, unknown>
    errors?: { message: string }[]
  }
}

export const buildUser = async (id: string, role = 'user') => {
  await Factory.build('user', { id, name: id, slug: id, role })
  return encode({ config: CONFIG })({ id, name: id, slug: id })
}

export const resetDatabase = async () => {
  await cleanDatabase()
  // The wipe happens here, the caches live over there.
  for (const backend of [FIRST, SECOND]) {
    const { errors } = await query(backend, 'mutation { resyncCaches }')
    if (errors) {
      throw new Error(`resyncCaches failed on ${backend}: ${JSON.stringify(errors)}`)
    }
  }
}

const subscribers = async (channel: string) => {
  const [, count] = (await redis.pubsub('NUMSUB', channel)) as [string, number]
  return count
}

// Returns the first event as a promise, and only once the backend listens to `channel`: an event
// published before that is lost, and no message of the protocol says when that moment has come.
// Redis does. The wait for nobody first is for the backend still leaving the previous test's.
export const subscribe = async (
  backend: string,
  token: string,
  channel: string,
  document: string,
) => {
  await eventually(
    async () => subscribers(channel),
    (count) => count === 0,
  )
  const client = createClient({
    url: backend.replace(/^http/, 'ws'),
    webSocketImpl: WebSocket,
    connectionParams: { headers: { authorization: `Bearer ${token}` } },
  })
  clients.push(client)
  const stream = new EventEmitter()
  // `once` also rejects on an 'error' event, which covers both ways a subscription can fail.
  const received = once(stream, 'event')
  client.subscribe(
    { query: document },
    {
      next: ({ data, errors }) => {
        if (errors) {
          stream.emit('error', new Error(errors.map(({ message }) => message).join('; ')))
        }
        stream.emit('event', data)
      },
      error: (error) => {
        stream.emit('error', error)
      },
      complete: () => {},
    },
  )
  await eventually(
    async () => subscribers(channel),
    (count) => count > 0,
  )
  return { event: received.then(([data]) => data as Record<string, unknown>) }
}
