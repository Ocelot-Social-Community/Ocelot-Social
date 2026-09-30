import { withFilter } from 'graphql-subscriptions'

import { GROUP_PERMISSIONS_CHANGED } from '@constants/subscriptions'
import { UserInputError } from '@graphql/errors'
import { groupPermissionCatalog, sanitizeGroupPermissions } from '@src/groupPermission'
import { coversRole, NONE_ROLE, SYSTEM_ROLE_NAMES, USUAL_ROLE } from '@src/groupRole'
import {
  deleteGroupRole,
  markGroupRolesCustomized,
  memberCountsByRole,
  readGroupRoles,
  readGroupRoleTemplates,
  renameGroupRole,
  replaceGroupRoles,
  writeGroupRole,
} from '@src/groupRole/repository'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { GroupRoleDefinition } from '@src/groupRole'

// A role name is a KEY, not a display name — the label carries the wording. Kept narrow on
// purpose: it ends up in `id` as `<groupId>:<name>`, in a membership property and in i18n
// lookups, so spaces, colons and case would all be trouble somewhere.
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/

const MAX_LABEL_LENGTH = 64

const withMemberCounts = async (
  context: Context,
  groupId: string,
  roles: GroupRoleDefinition[],
) => {
  const counts = await memberCountsByRole(context.database, groupId)
  return roles.map((role) => ({
    ...role,
    // `none` is the absence of a membership, so counting it would be counting everybody who
    // ever looked at the group.
    memberCount: role.name === NONE_ROLE ? null : (counts.get(role.name) ?? 0),
  }))
}

const groupRoles = async (context: Context, groupId: string) =>
  withMemberCounts(context, groupId, await readGroupRoles(context.database, groupId))

const requireRole = async (
  context: Context,
  groupId: string,
  name: string,
): Promise<GroupRoleDefinition> => {
  const role = (await readGroupRoles(context.database, groupId)).find(
    (candidate) => candidate.name === name,
  )
  if (!role) {
    throw new UserInputError('Unknown group role!')
  }
  return role
}

const validateLabel = (label: string | null | undefined): string | null => {
  if (label === undefined || label === null || label === '') {
    return null
  }
  if (label.length > MAX_LABEL_LENGTH || label.trim() !== label) {
    throw new UserInputError('Invalid role label!')
  }
  return label
}

/**
 * A group may not grant a role more than the actor holds themselves.
 *
 * Without this, `group.role.manage` would be a way to climb: an admin holding it could write
 * `group.type.change` into their own role and then use it. It is the same coverage rule that
 * governs handing out a role (groupRole/authority.ts), applied to defining one.
 */
const requireCoverage = async (
  context: Context,
  groupId: string,
  permissions: GroupPermissionKey[],
): Promise<void> => {
  const authorization = await context.groupAuthorization.forGroup(groupId)
  if (!authorization || !coversRole(authorization.effective, new Set(permissions))) {
    throw new UserInputError('You cannot grant rights you do not hold yourself!')
  }
}

// Every one of these mutations sits behind an authenticated shield rule, so the user is there
// — the type just cannot know it. One narrowing helper beats a non-null assertion per call site.
const actorId = (context: Context): string => {
  if (!context.user) {
    throw new UserInputError('Missing authenticated user!')
  }
  return context.user.id
}

const announce = (context: Context, groupId: string): void => {
  void context.pubsub.publish(GROUP_PERMISSIONS_CHANGED, {
    groupPermissionsChanged: { groupId },
  })
}

const touched = async (context: Context, groupId: string, now: string): Promise<void> => {
  await markGroupRolesCustomized(context.database, groupId, now)
  announce(context, groupId)
}

export default {
  Query: {
    groupPermissionCatalog: () => groupPermissionCatalog(),
  },
  Group: {
    myGroupRole: async (parent: { id: string }, _args, context: Context) => {
      const authorization = await context.groupAuthorization.forGroup(parent.id)
      // `none` is a role in the model but not a membership, and every client asking this
      // question means "what am I here" — so the answer for a non-member stays null.
      if (!authorization || authorization.roleName === NONE_ROLE) {
        return null
      }
      const role = (await readGroupRoles(context.database, parent.id)).find(
        (candidate) => candidate.name === authorization.roleName,
      )
      // memberCount is deliberately not counted here: this field answers "what am I", and a
      // count would turn every group teaser into an aggregation.
      return role ? { ...role, memberCount: null } : null
    },
    myGroupPermissions: async (parent: { id: string }, _args, context: Context) => {
      const authorization = await context.groupAuthorization.forGroup(parent.id)
      return [...(authorization?.effective ?? [])]
    },
    roles: async (parent: { id: string }, _args, context: Context) =>
      groupRoles(context, parent.id),
  },
  Mutation: {
    updateGroupRole: async (
      _parent,
      params: { groupId: string; name: string; permissions: string[]; label?: string | null },
      context: Context,
    ) => {
      const { groupId, name } = params
      const existing = await requireRole(context, groupId, name)
      const label = validateLabel(params.label)
      if (existing.protected) {
        // The owner role resolves to the whole catalog; a stored list would only ever be a
        // lie about what it can do. Relabelling it is fine.
        if (params.permissions.length > 0) {
          throw new UserInputError('The owner role holds every right and cannot be edited!')
        }
        const relabelled = { ...existing, label }
        await writeGroupRole(
          context.database,
          groupId,
          relabelled,
          actorId(context),
          new Date().toISOString(),
        )
        await touched(context, groupId, new Date().toISOString())
        return { ...relabelled, memberCount: null }
      }
      const permissions = sanitizeGroupPermissions(params.permissions)
      await requireCoverage(context, groupId, permissions)
      const now = new Date().toISOString()
      const updated = { ...existing, label, permissions }
      await writeGroupRole(context.database, groupId, updated, actorId(context), now)
      await touched(context, groupId, now)
      const [withCount] = await withMemberCounts(context, groupId, [updated])
      return withCount
    },
    createGroupRole: async (
      _parent,
      params: { groupId: string; name: string; permissions: string[]; label?: string | null },
      context: Context,
    ) => {
      const { groupId, name } = params
      if (!ROLE_NAME_PATTERN.test(name)) {
        throw new UserInputError('Invalid role name!')
      }
      if (SYSTEM_ROLE_NAMES.includes(name)) {
        throw new UserInputError('That name belongs to a system role!')
      }
      const existing = await readGroupRoles(context.database, groupId)
      if (existing.some((role) => role.name === name)) {
        throw new UserInputError('A role with that name already exists in this group!')
      }
      const permissions = sanitizeGroupPermissions(params.permissions)
      await requireCoverage(context, groupId, permissions)
      const now = new Date().toISOString()
      const created: GroupRoleDefinition = {
        name,
        label: validateLabel(params.label),
        system: false,
        protected: false,
        permissions,
      }
      await writeGroupRole(context.database, groupId, created, actorId(context), now)
      await touched(context, groupId, now)
      return { ...created, memberCount: 0 }
    },
    renameGroupRole: async (
      _parent,
      params: { groupId: string; name: string; newName: string },
      context: Context,
    ) => {
      const { groupId, name, newName } = params
      const existing = await requireRole(context, groupId, name)
      if (existing.system) {
        throw new UserInputError('A system role keeps its name; set its label instead!')
      }
      if (!ROLE_NAME_PATTERN.test(newName) || SYSTEM_ROLE_NAMES.includes(newName)) {
        throw new UserInputError('Invalid role name!')
      }
      const roles = await readGroupRoles(context.database, groupId)
      if (roles.some((role) => role.name === newName)) {
        throw new UserInputError('A role with that name already exists in this group!')
      }
      const now = new Date().toISOString()
      await renameGroupRole(context.database, groupId, name, newName, actorId(context), now)
      await touched(context, groupId, now)
      const [withCount] = await withMemberCounts(context, groupId, [{ ...existing, name: newName }])
      return withCount
    },
    deleteGroupRole: async (
      _parent,
      params: { groupId: string; name: string; reassignTo: string },
      context: Context,
    ) => {
      const { groupId, name, reassignTo } = params
      const existing = await requireRole(context, groupId, name)
      if (existing.system) {
        throw new UserInputError('A system role cannot be deleted!')
      }
      if (reassignTo === name) {
        throw new UserInputError('Members must be moved to a different role!')
      }
      // Must exist, or its members would end up holding a role that is not there — which fails
      // closed to no rights at all, i.e. members silently locked out of their own group.
      await requireRole(context, groupId, reassignTo)
      const now = new Date().toISOString()
      await deleteGroupRole(context.database, groupId, name, reassignTo, now)
      await touched(context, groupId, now)
      return name
    },
    resetGroupRoles: async (_parent, params: { groupId: string }, context: Context) => {
      const { groupId } = params
      const authorization = await context.groupAuthorization.forGroup(groupId)
      if (!authorization) {
        throw new UserInputError('Group not found!')
      }
      const templates = await readGroupRoleTemplates(context.database)
      const template = new Map(Object.entries(templates)).get(authorization.groupType)
      if (!template || template.length === 0) {
        throw new UserInputError('No role template for this group type!')
      }
      const now = new Date().toISOString()
      await replaceGroupRoles(
        context.database,
        groupId,
        template,
        // Members of a role the template does not have become ordinary members rather than
        // losing their membership.
        USUAL_ROLE,
        actorId(context),
        now,
      )
      announce(context, groupId)
      return groupRoles(context, groupId)
    },
    setGroupMemberRole: async (
      _parent,
      params: { groupId: string; userId: string; roleName: string },
      context: Context,
    ) => {
      const { groupId, userId, roleName } = params
      // Authorization (the right, dominance, coverage) is the shield's job; what is left here
      // is that the role exists, and keeping the group's chat room in step with membership.
      await requireRole(context, groupId, roleName)
      const now = new Date().toISOString()
      const result = await context.database.write({
        query: `
          MATCH (member:User {id: $userId})
          MATCH (group:Group {id: $groupId})
          MERGE (member)-[membership:MEMBER_OF]->(group)
          ON CREATE SET membership.createdAt = $now
          SET membership.role = $roleName, membership.updatedAt = $now
          RETURN member {.*} AS user, membership {.*} AS membership
        `,
        variables: { groupId, userId, roleName, now },
      })
      const record = result.records[0]
      if (!record) {
        throw new UserInputError('Could not find user or group!')
      }
      announce(context, groupId)
      // The driver hands these back untyped; the GraphQL layer validates the shape against
      // GroupMember on the way out.
      return {
        user: record.get('user') as Record<string, unknown>,
        membership: record.get('membership') as Record<string, unknown>,
      }
    },
  },
  Subscription: {
    groupPermissionsChanged: {
      subscribe: withFilter(
        (_parent, _args, context: Context) =>
          context.pubsub.asyncIterator(GROUP_PERMISSIONS_CHANGED),
        (payload: { groupPermissionsChanged: { groupId: string } }, args: { groupId: string }) =>
          payload.groupPermissionsChanged.groupId === args.groupId,
      ),
    },
  },
}
