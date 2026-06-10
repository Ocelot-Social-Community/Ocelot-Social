/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import databaseContext from '@context/database'
import { getContext } from '@src/context'
import { createInMemoryPolicyService } from '@src/policy'
import createServer from '@src/server'

import type { ApolloServerPlugin } from '@apollo/server'
import type CONFIG from '@config/index'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'
import type { DocumentNode } from 'graphql'

export const TEST_CONFIG = {
  NODE_ENV: 'test',
  DEBUG: undefined,
  TEST: true,
  PRODUCTION: false,
  PRODUCTION_DB_CLEAN_ALLOW: false,
  DISABLED_MIDDLEWARES: [],
  SEND_MAIL: false,
  PROXY_S3: 'http://localhost:9000',

  CLIENT_URI: 'http://webapp:3000',
  GRAPHQL_URI: 'http://localhost:4000',
  JWT_EXPIRES: '2y',

  MAPBOX_TOKEN:
    'pk.eyJ1IjoiYnVzZmFrdG9yIiwiYSI6ImNraDNiM3JxcDBhaWQydG1uczhpZWtpOW4ifQ.7TNRTO-o9aK1Y6MyW_Nd4g',
  JWT_SECRET: 'JWT_SECRET',

  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'neo4j',

  SENTRY_DSN_BACKEND: undefined,
  COMMIT: undefined,

  REDIS_DOMAIN: undefined,
  REDIS_PORT: undefined,
  REDIS_PASSWORD: undefined,

  LIVEKIT_URL: undefined,
  LIVEKIT_API_KEY: undefined,
  LIVEKIT_API_SECRET: undefined,
  LIVEKIT_ENABLED: false,

  AWS_ACCESS_KEY_ID: 'minio',
  AWS_SECRET_ACCESS_KEY: '12341234',
  AWS_ENDPOINT: 'http:/localhost:9000',
  AWS_REGION: 'local',
  AWS_BUCKET: 'ocelot',

  IMAGOR_SECRET: 'IMAGOR_SECRET',
  IMAGOR_PUBLIC_URL: 'IMAGOR_PUBLIC_URL',

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
  API_KEYS_ENABLED: false,

  LANGUAGE_DEFAULT: 'en',
  LOG_LEVEL: 'DEBUG',
} as const satisfies typeof CONFIG

interface OverwritableContextParams {
  authenticatedUser?: Context['user']
  config?: Partial<typeof CONFIG>
  // Override network-policy values for a test (e.g. { maxGroupPinnedPosts: 0 }).
  // The four flags also mirrored from config (publicRegistration, …) can still be
  // set via config for backwards compatibility; anything here takes precedence.
  policy?: Partial<NetworkPolicy>
  pubsub?: Context['pubsub']
}
interface CreateTestServerOptions {
  context: () => OverwritableContextParams | Promise<OverwritableContextParams>
  plugins?: ApolloServerPlugin[]
}

export const createApolloTestSetup = async (opts?: CreateTestServerOptions) => {
  const defaultOpts: CreateTestServerOptions = { context: () => ({ authenticatedUser: null }) }
  const { context: testContext, plugins } = opts ?? defaultOpts
  const database = databaseContext()
  const contextFn = async (req: { headers: { authorization?: string } }) => {
    const {
      authenticatedUser,
      config = {},
      policy: policyOverride = {},
      pubsub,
    } = await testContext()
    const merged = { ...TEST_CONFIG, ...config }
    // Build a per-request policy mirror so existing tests that toggle config.X keep
    // working; an explicit `policy` override (for keys with no config mirror, e.g.
    // maxGroupPinnedPosts / apiKeysMaxPerUser) takes precedence. Keys not set here
    // fall back to their schema defaults inside createInMemoryPolicyService.
    const policy = createInMemoryPolicyService({
      publicRegistration: merged.PUBLIC_REGISTRATION,
      inviteRegistration: merged.INVITE_REGISTRATION,
      categoriesActive: merged.CATEGORIES_ACTIVE,
      apiKeysEnabled: merged.API_KEYS_ENABLED,
      ...policyOverride,
    })
    return getContext({
      authenticatedUser,
      database,
      pubsub,
      config: merged,
      policy,
    })(req)
  }

  const { server } = await createServer({
    context: contextFn,
    plugins,
    skipLiveKitBoot: true,
  })

  const query = async (queryOpts: { query: DocumentNode | string; variables?: any }) => {
    const result = await server.executeOperation(
      { query: queryOpts.query, variables: queryOpts.variables },
      { contextValue: await contextFn({ headers: {} }) },
    )
    if (result.body.kind !== 'single') {
      throw new Error(
        `Unexpected incremental response (kind: "${result.body.kind}"). Test helper only supports single responses.`,
      )
    }
    return {
      data: (result.body.singleResult.data ?? null) as any,
      errors: result.body.singleResult.errors,
    }
  }

  const mutate = async (mutateOpts: { mutation: DocumentNode | string; variables?: any }) =>
    query({ query: mutateOpts.mutation, variables: mutateOpts.variables })

  return {
    server,
    query,
    mutate,
    database,
  }
}

export type ApolloTestSetup = Awaited<ReturnType<typeof createApolloTestSetup>>
