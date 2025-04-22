/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'node:http'

import { ApolloServer } from 'apollo-server-express'
import bodyParser from 'body-parser'
import express from 'express'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import { graphqlUploadExpress } from 'graphql-upload'
import helmet from 'helmet'
import Redis from 'ioredis'
import { Driver } from 'neo4j-driver'
import Neode from 'neode'

import CONFIG from './config'
import { getNeode, getDriver } from './db/neo4j'
import decode from './jwt/decode'
// eslint-disable-next-line import/no-cycle
import middleware from './middleware'
import schema from './schema'

export const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED'
export const CHAT_MESSAGE_ADDED = 'CHAT_MESSAGE_ADDED'
export const ROOM_COUNT_UPDATED = 'ROOM_COUNT_UPDATED'

const getPubSub = () => {
  const { REDIS_DOMAIN, REDIS_PORT, REDIS_PASSWORD } = CONFIG

  if (REDIS_DOMAIN && REDIS_PORT && REDIS_PASSWORD) {
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
  } else {
    return new PubSub()
  }
}

export const pubsub = getPubSub()
const driver = getDriver()
const neode = getNeode()

export interface Context {
  driver: Driver
  neode: Neode
  user: any
  req: any
  cypherParams: any
}

const getContext = async (req): Promise<Context> => {
  const user = await decode(driver, req.headers.authorization)
  return {
    driver,
    neode,
    user,
    req,
    cypherParams: {
      currentUserId: user ? user.id : null,
    },
  }
}
export const context = async (options) => {
  const { connection, req } = options
  if (connection) {
    return connection.context
  } else {
    return getContext(req)
  }
}

const createServer = (options?) => {
  const defaults = {
    context,
    schema: middleware(schema),
    subscriptions: {
      onConnect: (connectionParams, _webSocket) => {
        return getContext(connectionParams)
      },
    },
    debug: !!CONFIG.DEBUG,
    uploads: false,
    tracing: !!CONFIG.DEBUG,
    formatError: (error) => {
      if (error.message === 'ERROR_VALIDATION') {
        return new Error(error.originalError.details.map((d) => d.message))
      }
      return error
    },
  }
  const server = new ApolloServer(Object.assign({}, defaults, options))

  const app = express()

  app.set('driver', driver)
  // TODO: this exception is required for the graphql playground, since the playground loads external resources
  // See: https://github.com/graphql/graphql-playground/issues/1283
  app.use(
    helmet(
      (CONFIG.DEBUG && { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }) || {},
    ) as any,
  )
  // eslint-disable-next-line import/no-named-as-default-member
  app.use(express.static('public'))
  // eslint-disable-next-line import/no-named-as-default-member
  app.use(bodyParser.json({ limit: '10mb' }) as any)
  // eslint-disable-next-line import/no-named-as-default-member
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }) as any)
  app.use(graphqlUploadExpress())
  server.applyMiddleware({ app, path: '/' })
  const httpServer = http.createServer(app)
  server.installSubscriptionHandlers(httpServer)

  return { server, httpServer, app }
}

export default createServer
