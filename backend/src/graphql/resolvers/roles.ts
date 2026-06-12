import { ForbiddenError, UserInputError } from '@graphql/errors'
import { permissionCatalog } from '@src/permission'
import { OWNER_ROLE, RoleValidationError, effectiveRoleName } from '@src/role'

import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// Role name format: lowercase-ish slug, used as the node key and as a policy
// audience. Kept conservative so names stay safe identifiers.
const ROLE_NAME_RE = /^[a-z0-9][a-z0-9_-]{1,49}$/i

const toGraphqlRole = (def: RoleDefinition, memberCount: number | null = null) => ({
  name: def.name,
  description: def.description,
  protected: def.protected,
  permissions: def.permissions,
  memberCount,
})

// Member count for a single role (HAS_ROLE edges).
const countMembers = async (context: Context, name: string): Promise<number> => {
  const result = await context.database.query({
    query: `MATCH (:User)-[:HAS_ROLE]->(r:Role {id: $name}) RETURN count(*) AS count`,
    variables: { name },
  })
  return Number(result.records[0]?.get('count') ?? 0)
}

const actorIsOwner = (context: Context): boolean =>
  effectiveRoleName(context.user ?? {}) === OWNER_ROLE

export default {
  Query: {
    // Legacy: the built-in role names for the (legacy) switchUserRole UI. Kept
    // within the UserRole enum contract; the dynamic system uses `roles`.
    // eslint-disable-next-line @typescript-eslint/require-await
    availableRoles: async (_parent, _args, _context, _resolveInfo) => {
      return ['admin', 'moderator', 'user']
    },

    permissionCatalog: (_parent: unknown, _args: unknown, _context: Context) => permissionCatalog(),

    roles: async (_parent: unknown, _args: unknown, context: Context) => {
      const defs = context.role.allRoles()
      const result = await context.database.query({
        query: `MATCH (:User)-[:HAS_ROLE]->(r:Role) RETURN r.name AS name, count(*) AS count`,
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

    myPermissions: (_parent: unknown, _args: unknown, context: Context) => [
      ...context.effectivePermissions,
    ],
  },

  Mutation: {
    createRole: async (
      _parent: unknown,
      args: { name: string; description?: string | null; permissions: string[] },
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
            description: args.description ?? null,
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
      args: { name: string; description?: string | null; permissions: string[] },
      context: Context,
    ) => {
      if (!context.role.getRole(args.name)) {
        throw new UserInputError(`Unknown role: ${args.name}`)
      }
      try {
        const def = await context.role.upsertRole(
          {
            name: args.name,
            description: args.description ?? null,
            protected: false,
            permissions: args.permissions,
          },
          context.user?.id ?? 'unknown',
        )
        return toGraphqlRole(def, await countMembers(context, def.name))
      } catch (err) {
        if (err instanceof RoleValidationError) throw new ForbiddenError(err.message)
        throw err
      }
    },

    deleteRole: async (_parent: unknown, { name }: { name: string }, context: Context) => {
      try {
        await context.role.deleteRole(name, context.user?.id ?? 'unknown')
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
      // Only an owner may grant ownership (a role.manage admin must not escalate
      // themselves or others to owner).
      if (roleName === OWNER_ROLE && !actorIsOwner(context)) {
        throw new ForbiddenError('Only an owner may assign the owner role.')
      }
      // Never demote the last owner away from owner — keep the instance failsafe.
      if (roleName !== OWNER_ROLE) {
        const guard = await context.database.query({
          query: `OPTIONAL MATCH (target:User {id: $userId})-[:HAS_ROLE]->(targetOwner:Role {id: 'owner'})
                  OPTIONAL MATCH (o:User)-[:HAS_ROLE]->(:Role {id: 'owner'})
                  RETURN count(DISTINCT targetOwner) AS isOwner, count(DISTINCT o) AS ownerCount`,
          variables: { userId },
        })
        const row = guard.records[0]
        const targetIsOwner = Number(row?.get('isOwner') ?? 0) > 0
        const ownerCount = Number(row?.get('ownerCount') ?? 0)
        if (targetIsOwner && ownerCount <= 1) {
          throw new ForbiddenError('Cannot remove the last owner.')
        }
      }
      // Replace the single edge and keep the legacy `user.role` tier in sync (for
      // the not-yet-migrated frontend isAdmin/isModerator gating): owner/admin →
      // 'admin', moderator → 'moderator', any other role → 'user'.
      const result = await context.database.write({
        query: `MATCH (u:User {id: $userId})
                MATCH (r:Role {id: $roleName})
                OPTIONAL MATCH (u)-[old:HAS_ROLE]->(:Role)
                DELETE old
                WITH u, r
                MERGE (u)-[:HAS_ROLE]->(r)
                SET u.role = CASE
                  WHEN r.name IN ['owner', 'admin'] THEN 'admin'
                  WHEN r.name = 'moderator' THEN 'moderator'
                  ELSE 'user'
                END
                RETURN u {.*} AS user`,
        variables: { userId, roleName },
      })
      const user = result.records[0]?.get('user') as unknown
      if (!user) throw new UserInputError('Could not find User')
      return user
    },
  },

  User: {
    // The user's single role name. Source of truth is the HAS_ROLE edge; falls
    // back to the legacy `role` tier and then the baseline so an edgeless user
    // (e.g. a fresh signup) still reports its effective role. Gated by role.manage.
    roleName: async (parent: { id: string; role?: string }, _args: unknown, context: Context) => {
      const result = await context.database.query({
        query: `MATCH (:User {id: $id})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name ORDER BY r.name ASC LIMIT 1`,
        variables: { id: parent.id },
      })
      return (result.records[0]?.get('name') as string | undefined) ?? parent.role ?? 'user'
    },
  },
}
