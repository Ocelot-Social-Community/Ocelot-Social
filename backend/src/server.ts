import express from 'express'
import http from 'http'
import helmet from 'helmet'
import { ApolloServer } from 'apollo-server-express'
import CONFIG from './config'
import middleware from './middleware'
import { getNeode, getDriver } from './db/neo4j'
import decode from './jwt/decode'
import schema from './schema'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { PubSub } from 'graphql-subscriptions'
import Redis from 'ioredis'
import bodyParser from 'body-parser'
import { graphqlUploadExpress } from 'graphql-upload'

export const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED'
export const CHAT_MESSAGE_ADDED = 'CHAT_MESSAGE_ADDED'
export const ROOM_COUNT_UPDATED = 'ROOM_COUNT_UPDATED'
const { REDIS_DOMAIN, REDIS_PORT, REDIS_PASSWORD } = CONFIG
let prodPubsub, devPubsub
const options = {
  host: REDIS_DOMAIN,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000)
  },
}
if (options.host && options.port && options.password) {
  prodPubsub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  })
} else {
  devPubsub = new PubSub()
}
export const pubsub = prodPubsub || devPubsub
const driver = getDriver()
const neode = getNeode()

const getContext = async (req) => {
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
      onConnect: (connectionParams, webSocket) => {
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
  app.use(express.static('public'))
  app.use(bodyParser.json({ limit: '10mb' }) as any)
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }) as any)
  app.use(graphqlUploadExpress())
  server.applyMiddleware({ app, path: '/' })
  const httpServer = http.createServer(app)
  server.installSubscriptionHandlers(httpServer)

  return { server, httpServer, app }
}

export default createServer
