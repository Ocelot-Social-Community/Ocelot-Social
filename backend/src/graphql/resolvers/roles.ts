import { ForbiddenError, UserInputError } from '@graphql/errors'
import { groupFor, isPermissionAvailable, permissionCatalog } from '@src/permission'
import {
  OWNER_ROLE,
  PERMISSIONS_CHANGED_CHANNEL,
  RoleValidationError,
  effectiveRoleName,
} from '@src/role'

import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// Notify connected clients that effective permissions may have changed so they refetch
// their own (the permissionsChanged subscription). Fire-and-forget: the mutation has
// already committed; a pubsub hiccup must not fail it.
export const publishPermissionsChanged = (
  context: Context,
  roleName: string | null,
  // Set only for a rename: the role's former name, so a client whose admin roles view
  // has this role selected can follow the selection to the new name (and patch its
  // roles-query cache) instead of losing it on the refetch.
  previousRoleName: string | null = null,
): void => {
  // publish() may throw SYNCHRONOUSLY or reject ASYNCHRONOUSLY (its type is
  // void | Promise<void>), so guard BOTH: a bare Promise.resolve(publish()).catch()
  // would let a synchronous throw escape and crash the already-committed mutation.
  // Mirrors RoleService.publishChange / PolicyService.publishChange.
  try {
    const result = context.pubsub.publish(PERMISSIONS_CHANGED_CHANNEL, {
      permissionsChanged: { roleName, previousRoleName },
    })
    void Promise.resolve(result).catch(() => {
      /* best-effort broadcast (async rejection) */
    })
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    /* best-effort broadcast (synchronous throw) */
  }
}

// Role name format: lowercase-ish slug, used as the node key and as a policy
// audience. Kept conservative so names stay safe identifiers.
const ROLE_NAME_RE = /^[a-z0-9][a-z0-9_-]{1,49}$/i

// A Neo4j uniqueness-constraint violation on Role.id. Reachable only via renameRole's
// `SET r.id` losing a race to a concurrent rename (createRole/updateRole MERGE, so they
// never trip it). Detected by the driver error code — same guard the other resolvers use.
const isRoleNameConflict = (err: unknown): boolean =>
  err instanceof Error &&
  'code' in err &&
  err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed'

const toGraphqlRole = (def: RoleDefinition, memberCount: number | null = null) => ({
  name: def.name,
  protected: def.protected,
  permissions: def.permissions,
  memberCount,
})

// Member count for a single role. Members are counted by their single HAS_ROLE
// edge; an edgeless user (should not occur post-migration) falls back to the
// baseline — consistent with effectiveRoleName.
const countMembers = async (context: Context, name: string): Promise<number> => {
  const result = await context.database.query({
    query: `MATCH (u:User)
            WHERE coalesce(u.deleted, false) = false
            OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
            WITH coalesce(r.name, 'user') AS roleName
            WHERE roleName = $name
            RETURN count(*) AS count`,
    variables: { name },
  })
  return Number(result.records[0]?.get('count') ?? 0)
}

const actorIsOwner = (context: Context): boolean =>
  effectiveRoleName(context.user ?? {}) === OWNER_ROLE

export default {
  Query: {
    // Each catalog entry carries its runtime gate (gatedBy) and whether that gate is
    // currently open (available) for THIS request's config/policy, so the admin roles
    // UI can disable rights whose feature isn't configured (e.g. video conferencing).
    permissionCatalog: (_parent: unknown, _args: unknown, context: Context) =>
      permissionCatalog().map((entry) => ({
        ...entry,
        // Coerce the optional gate to null: GraphQL errors on a resolver returning
        // undefined for a nullable field; null is the explicit "no gate" value.
        gatedBy: entry.gatedBy ?? null,
        available: isPermissionAvailable(entry.key, context),
      })),

    roles: async (_parent: unknown, _args: unknown, context: Context) => {
      const defs = context.role.allRoles()
      // Count every (non-deleted) user once, by their single HAS_ROLE edge (edgeless
      // users fall back to the baseline) — see countMembers above.
      const result = await context.database.query({
        query: `MATCH (u:User)
                WHERE coalesce(u.deleted, false) = false
                OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
                WITH coalesce(r.name, 'user') AS roleName
                RETURN roleName AS name, count(*) AS count`,
      })
      const counts = new Map<string, number>(
        result.records.map((record) => [record.get('name') as string, Number(record.get('count'))]),
      )
      return defs.map((def) => toGraphqlRole(def, counts.get(def.name) ?? 0))
    },

    userRoles: async (_parent: unknown, { userId }: { userId: string }, context: Context) => {
      const result = await context.database.query({
        query: `MATCH (:User {id: $userId})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name`,
        variables: { userId },
      })
      return result.records
        .map((record) => context.role.getRole(record.get('name') as string))
        .filter((def): def is RoleDefinition => !!def)
        .map((def) => toGraphqlRole(def))
    },

    // Each effective permission carries its catalog group, so the webapp can gate UI
    // areas by group (e.g. admin area = ANY administration-group permission) from a
    // single payload — no second query and no key/group drift. A right whose runtime
    // gate is closed (feature not configured) is dropped here too, so the viewer's
    // can() reflects what is actually usable, not just what the role nominally grants.
    myPermissions: (_parent: unknown, _args: unknown, context: Context) =>
      [...context.effectivePermissions]
        .filter((key) => isPermissionAvailable(key, context))
        .map((key) => ({ key, group: groupFor(key) })),
  },

  Mutation: {
    createRole: async (
      _parent: unknown,
      args: { name: string; permissions: string[] },
      context: Context,
    ) => {
      if (!ROLE_NAME_RE.test(args.name)) {
        throw new UserInputError('Invalid role name.')
      }
      if (context.role.getRole(args.name)) {
        throw new UserInputError(`Role '${args.name}' already exists.`)
      }
      try {
        const def = await context.role.upsertRole(
          {
            name: args.name,
            protected: false,
            permissions: args.permissions,
          },
          context.user?.id ?? 'unknown',
        )
        return toGraphqlRole(def, 0)
      } catch (err) {
        // A protected/baseline violation is a client error, not internal.
        if (err instanceof RoleValidationError) throw new ForbiddenError(err.message)
        throw err
      }
    },

    updateRole: async (
      _parent: unknown,
      args: { name: string; permissions: string[] },
      context: Context,
    ) => {
      if (!context.role.getRole(args.name)) {
        throw new UserInputError(`Unknown role: ${args.name}`)
      }
      try {
        const def = await context.role.upsertRole(
          {
            name: args.name,
            protected: false,
            permissions: args.permissions,
          },
          context.user?.id ?? 'unknown',
        )
        // The permission set changed → every holder of this role must refetch.
        publishPermissionsChanged(context, def.name)
        return toGraphqlRole(def, await countMembers(context, def.name))
      } catch (err) {
        if (err instanceof RoleValidationError) throw new ForbiddenError(err.message)
        throw err
      }
    },

    renameRole: async (
      _parent: unknown,
      { name, newName }: { name: string; newName: string },
      context: Context,
    ) => {
      if (!ROLE_NAME_RE.test(newName)) {
        throw new UserInputError('Invalid role name.')
      }
      if (!context.role.getRole(name)) {
        throw new UserInputError(`Unknown role: ${name}`)
      }
      if (name !== newName && context.role.getRole(newName)) {
        throw new UserInputError(`Role '${newName}' already exists.`)
      }
      try {
        const def = await context.role.renameRole(name, newName, context.user?.id ?? 'unknown')
        // The role's identity changed → every holder's roleName changed and any open
        // admin roles view must refetch. Broadcast the new name AND the old one, so a
        // viewer with this role selected can follow it to its new name.
        publishPermissionsChanged(context, def.name, name)
        return toGraphqlRole(def, await countMembers(context, def.name))
      } catch (err) {
        if (err instanceof RoleValidationError) throw new ForbiddenError(err.message)
        // Lost the uniqueness-constraint race on Role.id: a concurrent rename claimed
        // `newName` between our getRole(newName) snapshot and the write. Surface the same
        // stable conflict as the pre-check, not a raw driver error.
        if (isRoleNameConflict(err)) throw new UserInputError(`Role '${newName}' already exists.`)
        throw err
      }
    },

    deleteRole: async (_parent: unknown, { name }: { name: string }, context: Context) => {
      try {
        await context.role.deleteRole(name, context.user?.id ?? 'unknown')
        // Former holders fall back to the baseline → they must refetch.
        publishPermissionsChanged(context, name)
        return name
      } catch (err) {
        if (err instanceof RoleValidationError) throw new ForbiddenError(err.message)
        throw err
      }
    },

    // Set a user's single role (replaces whatever role they had). Single-role
    // model: there is exactly one HAS_ROLE edge per user.
    setUserRole: async (
      _parent: unknown,
      { userId, roleName }: { userId: string; roleName: string },
      context: Context,
    ) => {
      if (!context.role.getRole(roleName)) {
        throw new UserInputError(`Unknown role: ${roleName}`)
      }
      // Owner status is owner-controlled. Look up whether the target is currently an
      // owner and how many owners exist.
      const guard = await context.database.query({
        query: `OPTIONAL MATCH (target:User {id: $userId})-[:HAS_ROLE]->(targetOwner:Role {id: 'owner'})
                OPTIONAL MATCH (o:User)-[:HAS_ROLE]->(:Role {id: 'owner'})
                RETURN count(DISTINCT targetOwner) AS isOwner, count(DISTINCT o) AS ownerCount`,
        variables: { userId },
      })
      const row = guard.records[0]
      const targetIsOwner = Number(row?.get('isOwner') ?? 0) > 0
      const ownerCount = Number(row?.get('ownerCount') ?? 0)

      // Only an owner may grant the owner role OR change an owner's role; a
      // role.manage admin manages non-owner roles only (no escalating to owner, no
      // demoting an owner).
      if ((roleName === OWNER_ROLE || targetIsOwner) && !actorIsOwner(context)) {
        throw new ForbiddenError('Only an owner may assign or change the owner role.')
      }
      // Never demote the last owner — keep the instance failsafe.
      if (targetIsOwner && roleName !== OWNER_ROLE && ownerCount <= 1) {
        throw new ForbiddenError('Cannot remove the last owner.')
      }
      // Replace the user's single HAS_ROLE edge.
      const result = await context.database.write({
        query: `MATCH (u:User {id: $userId})
                MATCH (r:Role {id: $roleName})
                OPTIONAL MATCH (u)-[old:HAS_ROLE]->(:Role)
                DELETE old
                WITH u, r
                MERGE (u)-[:HAS_ROLE]->(r)
                RETURN u {.*} AS user`,
        variables: { userId, roleName },
      })
      const user = result.records[0]?.get('user') as unknown
      if (!user) throw new UserInputError('Could not find User')
      // The target user's effective permissions changed → they must refetch.
      publishPermissionsChanged(context, roleName)
      return user
    },
  },

  Subscription: {
    permissionsChanged: {
      // Broadcast to every connected client; each refetches its own myPermissions.
      // No per-viewer filter — the payload reveals only the affected role name.
      subscribe: (_parent: unknown, _args: unknown, { pubsub }: Context) =>
        pubsub.asyncIterator(PERMISSIONS_CHANGED_CHANNEL),
      resolve: (payload: {
        permissionsChanged: { roleName: string | null; previousRoleName?: string | null }
      }) => payload.permissionsChanged,
    },
  },

  User: {
    // The user's single role name (source of truth: the HAS_ROLE edge). Falls back
    // to the baseline so an edgeless user still reports an effective role. Gated by
    // role.manage.
    roleName: async (parent: { id: string }, _args: unknown, context: Context) => {
      const result = await context.database.query({
        query: `MATCH (:User {id: $id})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name ORDER BY r.name ASC LIMIT 1`,
        variables: { id: parent.id },
      })
      return (result.records[0]?.get('name') as string | undefined) ?? 'user'
    },
  },
}
