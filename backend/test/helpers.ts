import { createTestClient } from 'apollo-server-testing'

import databaseContext from '@context/database'
import type CONFIG from '@src/config'
import type { Context } from '@src/context'
import { getContext } from '@src/context'
import createServer from '@src/server'

import type { ApolloServerExpressConfig } from 'apollo-server-express'

export const TEST_CONFIG = {
  NODE_ENV: 'test',
  DEBUG: undefined,
  TEST: true,
  PRODUCTION: false,
  PRODUCTION_DB_CLEAN_ALLOW: false,
  DISABLED_MIDDLEWARES: [],
  SEND_MAIL: false,

  CLIENT_URI: 'http://webapp:3000',
  GRAPHQL_URI: 'http://localhost:4000',
  JWT_EXPIRES: '2y',

  MAPBOX_TOKEN:
    'pk.eyJ1IjoiYnVzZmFrdG9yIiwiYSI6ImNraDNiM3JxcDBhaWQydG1uczhpZWtpOW4ifQ.7TNRTO-o9aK1Y6MyW_Nd4g',
  JWT_SECRET: 'JWT_SECRET',
  PRIVATE_KEY_PASSPHRASE: 'PRIVATE_KEY_PASSPHRASE',

  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'neo4j',

  SENTRY_DSN_BACKEND: undefined,
  COMMIT: undefined,

  REDIS_DOMAIN: undefined,
  REDIS_PORT: undefined,
  REDIS_PASSWORD: undefined,

  AWS_ACCESS_KEY_ID: 'minio',
  AWS_SECRET_ACCESS_KEY: '12341234',
  AWS_ENDPOINT: 'http:/minio:9000',
  AWS_REGION: 'local',
  AWS_BUCKET: 'ocelot',

  IMAGOR_SECRET: 'IMAGOR_SECRET',
  S3_PUBLIC_GATEWAY: undefined,

  EMAIL_DEFAULT_SENDER: '',
  SUPPORT_EMAIL: '',
  SUPPORT_URL: '',
  APPLICATION_NAME: '',
  ORGANIZATION_URL: '',
  PUBLIC_REGISTRATION: false,
  INVITE_REGISTRATION: true,
  INVITE_CODES_PERSONAL_PER_USER: 7,
  INVITE_CODES_GROUP_PER_USER: 7,
  CATEGORIES_ACTIVE: false,
  MAX_PINNED_POSTS: 1,

  LANGUAGE_DEFAULT: 'en',
  LOG_LEVEL: 'DEBUG',
} as const satisfies typeof CONFIG

interface OverwritableContextParams {
  authenticatedUser?: Context['user']
  config?: Partial<typeof CONFIG>
  pubsub?: Context['pubsub']
}
interface CreateTestServerOptions {
  context: () => OverwritableContextParams | Promise<OverwritableContextParams>
  plugins?: ApolloServerExpressConfig['plugins']
}

export const createApolloTestSetup = (opts?: CreateTestServerOptions) => {
  const defaultOpts: CreateTestServerOptions = { context: () => ({ authenticatedUser: null }) }
  const { context: testContext, plugins } = opts ?? defaultOpts
  const database = databaseContext()
  const context = async (req: { headers: { authorization?: string } }) => {
    const { authenticatedUser, config = {}, pubsub } = await testContext()
    return getContext({
      authenticatedUser,
      database,
      pubsub,
      config: { ...TEST_CONFIG, ...config },
    })(req)
  }

  const server = createServer({
    context,
    plugins,
  }).server
  const { mutate, query } = createTestClient(server)
  return {
    server,
    query,
    mutate,
    database,
  }
}

export type ApolloTestSetup = ReturnType<typeof createApolloTestSetup>
