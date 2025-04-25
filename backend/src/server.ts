/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-named-as-default-member */
import http from 'node:http'

import { ApolloServer } from 'apollo-server-express'
import bodyParser from 'body-parser'
import express from 'express'
import { graphqlUploadExpress } from 'graphql-upload'
import helmet from 'helmet'

import databaseContext from '@context/database'
import pubsubContext from '@context/pubsub'

import CONFIG from './config'
import decode from './jwt/decode'
import middleware from './middleware'
import schema from './schema'

const serverDatabase = databaseContext()
const serverPubsub = pubsubContext()

const databaseUser = async (req) => decode(serverDatabase.driver, req.headers.authorization)

export const getContext =
  (
    {
      database = serverDatabase,
      pubsub = serverPubsub,
      user = databaseUser,
    }: {
      database?: ReturnType<typeof databaseContext>
      pubsub?: ReturnType<typeof pubsubContext>
      user?: (any) => Promise<any>
    } = { database: serverDatabase, pubsub: serverPubsub, user: databaseUser },
  ) =>
  async (req) => {
    const u = await user(req)
    return {
      database,
      driver: database.driver,
      neode: database.neode,
      pubsub,
      user: u,
      req,
      cypherParams: {
        currentUserId: u ? u.id : null,
      },
    }
  }

export const context = async (options) => {
  const { connection, req } = options
  if (connection) {
    return connection.context
  } else {
    return getContext()(req)
  }
}

const createServer = (options?) => {
  const defaults = {
    context,
    schema: middleware(schema),
    subscriptions: {
      onConnect: (connectionParams) => getContext()(connectionParams),
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
  const server = new ApolloServer(Object.assign(defaults, options))

  const app = express()

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
