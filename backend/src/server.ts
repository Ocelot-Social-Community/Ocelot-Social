/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-named-as-default-member */
import http from 'node:http'

import { ApolloServer } from 'apollo-server-express'
import bodyParser from 'body-parser'
import express from 'express'
import { graphqlUploadExpress } from 'graphql-upload'
import helmet from 'helmet'

import CONFIG from './config'
import { context, getContext } from './context'
import schema from './graphql/schema'
import middleware from './middleware'

import type { ApolloServerExpressConfig } from 'apollo-server-express'

const createServer = (options?: ApolloServerExpressConfig) => {
  const defaults: ApolloServerExpressConfig = {
    context,
    schema: middleware(schema),
    subscriptions: {
      onConnect: (connectionParams) =>
        getContext()(connectionParams as { headers: { authorization?: string } }),
    },
    debug: !!CONFIG.DEBUG,
    uploads: false,
    tracing: !!CONFIG.DEBUG,
    formatError: (error) => {
      // console.log(error.originalError)
      if (error.message === 'ERROR_VALIDATION') {
        return new Error((error.originalError as any).details.map((d) => d.message))
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
