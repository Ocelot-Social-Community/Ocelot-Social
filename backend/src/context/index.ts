import databaseContext from '@context/database'
import pubsubContext from '@context/pubsub'
import CONFIG from '@src/config'
import { decode } from '@src/jwt/decode'
import ocelotLogger from '@src/logger'
import { getPolicyService } from '@src/policy'
import { effectiveRoleName, getRoleService } from '@src/role'

import type { DecodedUser } from '@src/jwt/decode'
import type { PermissionKey } from '@src/permission'
import type { PolicyService } from '@src/policy'
import type { RoleService } from '@src/role'

const serverDatabase = databaseContext()
const serverPubsub = pubsubContext()

export { serverDatabase, serverPubsub }

export const getContext =
  (opts?: {
    database?: ReturnType<typeof databaseContext>
    pubsub?: ReturnType<typeof pubsubContext>
    authenticatedUser: DecodedUser | null | undefined
    logger?: typeof ocelotLogger
    config: typeof CONFIG
    policy?: PolicyService
    role?: RoleService
  }) =>
  async (req: { headers: { authorization?: string } }) => {
    const {
      database = serverDatabase,
      pubsub = serverPubsub,
      authenticatedUser,
      logger = ocelotLogger,
      config = CONFIG,
      policy = getPolicyService(),
      role = getRoleService(),
    } = opts ?? {}
    const { driver } = database
    const user =
      authenticatedUser === null
        ? null
        : (authenticatedUser ?? (await decode({ driver, config })(req.headers.authorization)))
    // The per-request effective permission set, resolved once from the user's
    // single role (owner ⇒ full catalog). The seam for masks (view-as, OAuth
    // scopes) that will intersect this set later. Anonymous viewers hold none.
    const effectivePermissions: Set<PermissionKey> = user
      ? role.permissionsForRole(effectiveRoleName(user))
      : new Set<PermissionKey>()
    const result = {
      database,
      driver,
      neode: database.neode,
      pubsub,
      logger,
      user,
      req,
      cypherParams: {
        currentUserId: user ? user.id : null,
        languageDefault: config.LANGUAGE_DEFAULT.toUpperCase(),
      },
      config,
      policy,
      role,
      effectivePermissions,
    }
    return result
  }

export type Context = Awaited<ReturnType<ReturnType<typeof getContext>>>
