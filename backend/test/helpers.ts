/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import databaseContext from '@context/database'
import { getContext } from '@src/context'
import { createInMemoryPolicyService } from '@src/policy'
import { createInMemoryRoleService, resolveRoleName } from '@src/role'
import createServer from '@src/server'

import type { ApolloServerPlugin } from '@apollo/server'
import type CONFIG from '@config/index'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'
import type { RoleDefinition, RoleService } from '@src/role'
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

  LANGUAGE_DEFAULT: 'en',
  LOG_LEVEL: 'DEBUG',
} as const satisfies typeof CONFIG

interface OverwritableContextParams {
  authenticatedUser?: Context['user']
  config?: Partial<typeof CONFIG>
  // Override network-policy values for a test (e.g. { categoriesActive: true,
  // maxGroupPinnedPosts: 0 }); unset keys fall back to their schema defaults.
  policy?: Partial<NetworkPolicy>
  // Override the role definitions for a test (e.g. to revoke a baseline
  // permission from the `user` role); defaults to the seeded DEFAULT_ROLES. The
  // user's effective permissions are resolved from these via their role string.
  roles?: RoleDefinition[]
  // Inject a real (DB-backed) RoleService instead of the in-memory default —
  // needed by tests that mutate roles / HAS_ROLE edges (createRole, assignRole …).
  roleService?: RoleService
  pubsub?: Context['pubsub']
}
interface CreateTestServerOptions {
  context: () => OverwritableContextParams | Promise<OverwritableContextParams>
  plugins?: ApolloServerPlugin[]
}

// Resolve the authenticated user's single role name from its HAS_ROLE edge, the way
// decode() does in production. Tests build authenticatedUser from user.toJson(), which
// carries no role name; without this the user would resolve to no permissions. The
// DB edge wins (collapsed via resolveRoleName, so multi-edge fails closed); if the
// user has no node (a bare literal like { id, roleName: 'owner' }), the literal
// roleName already on it is kept.
const resolveAuthUserRoles = async (
  database: ReturnType<typeof databaseContext>,
  authenticatedUser: Context['user'] | undefined,
): Promise<Context['user'] | undefined> => {
  if (!authenticatedUser?.id) return authenticatedUser
  const result = await database.query({
    query: `MATCH (u:User {id: $id}) RETURN [(u)-[:HAS_ROLE]->(r:Role) | r.name] AS roles`,
    variables: { id: authenticatedUser.id },
  })
  const dbRoles = (result.records[0]?.get('roles') as string[] | undefined) ?? []
  if (dbRoles.length > 0) return { ...authenticatedUser, roleName: resolveRoleName(dbRoles) }
  return { ...authenticatedUser, roleName: authenticatedUser.roleName }
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
      roles: rolesOverride,
      roleService,
      pubsub,
    } = await testContext()
    const merged = { ...TEST_CONFIG, ...config }
    // Network policy values are set per-test via the `policy` override; any key not
    // set falls back to its schema default inside createInMemoryPolicyService.
    const policy = createInMemoryPolicyService(policyOverride)
    // Roles default to the seeded DEFAULT_ROLES so authorization resolves exactly
    // as in production; a test can override the definitions, or inject a real
    // DB-backed RoleService when it needs to mutate roles / HAS_ROLE edges.
    const role = roleService ?? createInMemoryRoleService(rolesOverride)
    // Tests set authenticatedUser from `user.toJson()`, which does not carry the
    // user's role name. Production resolves it in decode() from the HAS_ROLE edge;
    // mirror that here so effectivePermissions are correct (the legacy user.role
    // carrier is gone). Role nodes + edges exist because cleanDatabase seeds them.
    const resolvedUser = await resolveAuthUserRoles(database, authenticatedUser)
    return getContext({
      authenticatedUser: resolvedUser,
      database,
      pubsub,
      config: merged,
      policy,
      role,
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
