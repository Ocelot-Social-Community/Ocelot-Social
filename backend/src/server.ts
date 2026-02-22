/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-deprecated */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import http from 'node:http'

import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import bodyParser from 'body-parser'
import express from 'express'
import { graphqlUploadExpress } from 'graphql-upload'
import { useServer } from 'graphql-ws/lib/use/ws'
import helmet from 'helmet'
import { WebSocketServer } from 'ws'

import CONFIG from './config'
import { getContext } from './context'
import schema from './graphql/schema'
import logger from './logger'
import middleware from './middleware'

import type { ApolloServerPlugin, BaseContext } from '@apollo/server'

interface CreateServerOptions {
  context?: (req: { headers: { authorization?: string } }) => Promise<any>
  plugins?: ApolloServerPlugin<BaseContext>[]
}

const createServer = async (options?: CreateServerOptions) => {
  const app = express()
  const httpServer = http.createServer(app)
  const appliedSchema = middleware(schema)

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: '/' })
  const serverCleanup = useServer(
    {
      schema: appliedSchema,
      context: async (ctx) =>
        getContext()(ctx.connectionParams as { headers: { authorization?: string } }),
      onDisconnect: () => {
        logger.debug('WebSocket client disconnected')
      },
    },
    wsServer,
  )

  const server = new ApolloServer({
    schema: appliedSchema,
    formatError: (formattedError, error) => {
      if (formattedError.message === 'ERROR_VALIDATION') {
        return {
          ...formattedError,
          message: String(
            ((error as any).originalError as any)?.details?.map((d) => d.message) ?? formattedError.message,
          ),
        }
      }
      return formattedError
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            },
          }
        },
      },
      ...(options?.plugins ?? []),
    ],
  })

  await server.start()

  // TODO: this exception is required for the graphql playground, since the playground loads external resources
  // See: https://github.com/graphql/graphql-playground/issues/1283
  app.use(
    helmet(
      (CONFIG.DEBUG && { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }) || {},
    ) as any,
  )
  app.use(express.static('public'))
  app.use(graphqlUploadExpress())
  app.use(
    '/',
    bodyParser.json({ limit: '10mb' }) as any,
    bodyParser.urlencoded({ limit: '10mb', extended: true }) as any,
    expressMiddleware(server, {
      context: async ({ req }) => {
        if (options?.context) {
          return options.context(req)
        }
        return getContext()(req)
      },
    }),
  )

  return { server, httpServer, app }
}

export default createServer
