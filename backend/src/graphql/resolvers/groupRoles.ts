import { withFilter } from 'graphql-subscriptions'

import { GROUP_PERMISSIONS_CHANGED } from '@constants/subscriptions'
import { UserInputError } from '@graphql/errors'
import { groupPermissionCatalog, sanitizeGroupPermissions } from '@src/groupPermission'
import {
  coversRole,
  PRIVACY_LEVELS,
  createPermissionForLevel,
  isMorePrivate,
  NONE_ROLE,
  OWNER_ROLE,
  privacyLevelOfPermissions,
  SYSTEM_ROLE_NAMES,
  USUAL_ROLE,
} from '@src/groupRole'
import {
  deleteGroupRole,
  markGroupRolesCustomized,
  memberCountsByRole,
  readGroupRoles,
  readGroupRoleTemplates,
  renameGroupRole,
  replaceGroupRoles,
  untouchedGroupIdsByType,
  writeGroupRole,
  writeGroupRoleTemplate,
} from '@src/groupRole/repository'
import { isPermissionAvailable } from '@src/permission'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { GroupPrivacyLevel, GroupRoleDefinition } from '@src/groupRole'
import type { GroupAuthorization } from '@src/groupRole/requestScope'
import type { PermissionKey } from '@src/permission'

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

/** The network side of a right, gate-aware — the same reading the shield's rules use. */
const hasNetworkPermission = (context: Context, permission: PermissionKey): boolean =>
  context.effectivePermissions.has(permission) && isPermissionAvailable(permission, context)

/**
 * Making a group MORE private needs the right to have created it that way (concept E10).
 *
 * `group.type.change` is capped by `group.create_<type>`, but the type is derived from the
 * rights now — so without this the cap would be one edit away from pointless: create a public
 * group with `group.create_public`, take `group.read` off its non-member role, and the result
 * is an unlisted group nobody checked `group.create_hidden` for.
 *
 * Only the direction that takes something away is checked. Opening a group up asks for no
 * right: whoever may edit the roles can already see everything inside.
 */
const requirePrivacyCap = (
  context: Context,
  authorization: GroupAuthorization,
  nextNonMemberPermissions: GroupPermissionKey[],
): void => {
  const next = privacyLevelOfPermissions(nextNonMemberPermissions)
  if (!isMorePrivate(next, authorization.groupType as GroupPrivacyLevel)) {
    return
  }
  const needed = createPermissionForLevel(next)
  if (!needed || !hasNetworkPermission(context, needed)) {
    throw new UserInputError('You cannot make this group more private than you may create one!')
  }
}

/**
 * A group may not grant a role more than the actor holds themselves.
 *
 * Without this, `group.role.manage` would be a way to climb: an admin holding it could write
 * `group.type.change` into their own role and then use it. It is the same coverage rule that
 * governs handing out a role (groupRole/authority.ts), applied to defining one.
 *
 * What is checked is what the edit ADDS, not the whole resulting list. Keeping a right the
 * role already had grants nobody anything, and demanding coverage for it made every role
 * holding a right that is currently switched off network-wide uneditable: the video call
 * rights are in every seeded `usual` role, a network without LiveKit has them gated out of
 * everybody's effective set, and so "members may comment" could not be unticked either —
 * the whole list went back with the request and the gated keys failed the comparison.
 * Removing is always allowed, and an UNCHANGED right cannot be an escalation.
 */
const requireCoverage = async (
  context: Context,
  groupId: string,
  permissions: GroupPermissionKey[],
  existing: readonly GroupPermissionKey[] = [],
): Promise<GroupAuthorization> => {
  const authorization = await context.groupAuthorization.forGroup(groupId)
  const held = new Set(existing)
  const added = new Set(permissions.filter((permission) => !held.has(permission)))
  if (!authorization || !coversRole(authorization.effective, added)) {
    throw new UserInputError('You cannot grant rights you do not hold yourself!')
  }
  // Handed back rather than resolved twice: the group it found is the one the privacy cap
  // asks about, and a second lookup would be a second chance to disagree with it.
  return authorization
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

interface AdminGroupFilter {
  search?: string | null
  groupType?: string | null
  ownerless?: boolean | null
  disabled?: boolean | null
  first?: number | null
  offset?: number | null
}

/**
 * The group types this viewer may administer.
 *
 * The list IS the authorization: a viewer holding only `group.administer.any_public` gets public
 * groups and nothing else, so a hidden group cannot be enumerated by asking for it.
 */
const administrableGroupTypes = (context: Context): string[] =>
  ['public', 'closed', 'hidden'].filter((groupType) =>
    context.effectivePermissions.has(`group.administer.any_${groupType}` as PermissionKey),
  )

/**
 * The admin group list, and the count behind the same filters.
 *
 * Its own query rather than an option on `Query.Group`: that one answers "the groups I am in or
 * may see", this one answers "the groups I may administer", and conflating the two is how a
 * hidden group ends up in a listing it has no business being in.
 */
const adminGroupList = async (context: Context, params: AdminGroupFilter, countOnly = false) => {
  const types = administrableGroupTypes(context)
  const requested = params.groupType ? [params.groupType].filter((t) => types.includes(t)) : types
  if (requested.length === 0) {
    return countOnly ? 0 : []
  }
  const clauses = ['g.groupType IN $types', 'coalesce(g.deleted, false) = false']
  if (params.search) {
    clauses.push('(toLower(g.name) CONTAINS toLower($search) OR g.slug CONTAINS toLower($search))')
  }
  if (params.disabled === true || params.disabled === false) {
    clauses.push('coalesce(g.disabled, false) = $disabled')
  }
  if (params.ownerless === true) {
    clauses.push('ownerCount = 0')
  }
  const variables = {
    types: requested,
    search: params.search ?? '',
    disabled: params.disabled ?? false,
    first: params.first ?? 25,
    offset: params.offset ?? 0,
  }
  const result = await context.database.query({
    query: `
      MATCH (g:Group)
      OPTIONAL MATCH (:User)-[m:MEMBER_OF]->(g)
      WHERE m.role = '${OWNER_ROLE}'
      WITH g, count(m) AS ownerCount
      WHERE ${clauses.join(' AND ')}
      ${
        countOnly
          ? 'RETURN toString(count(g)) AS count'
          : `RETURN g {.*, ownerCount: ownerCount} AS group
             ORDER BY toLower(g.name) ASC
             SKIP toInteger($offset) LIMIT toInteger($first)`
      }
    `,
    variables,
  })
  if (countOnly) {
    return Number.parseInt((result.records[0]?.get('count') as string) ?? '0', 10)
  }
  return result.records.map((record) => record.get('group') as Record<string, unknown>)
}

export default {
  Query: {
    groupPermissionCatalog: () => groupPermissionCatalog(),
    adminGroups: async (_parent, params: AdminGroupFilter, context: Context) =>
      adminGroupList(context, params),
    adminGroupCount: async (_parent, params: AdminGroupFilter, context: Context) =>
      adminGroupList(context, params, true),
    groupRoleTemplates: async (_parent, _args, context: Context) => {
      const [templates, untouched] = await Promise.all([
        readGroupRoleTemplates(context.database),
        untouchedGroupIdsByType(context.database),
      ])
      // Least private first, from the one list that orders the levels (groupRole/privacyLevel):
      // the tabs are a scale, and an alphabet reads as "closed, secret, public".
      const ordered = [...Object.entries(templates)].sort(
        ([a], [b]) =>
          PRIVACY_LEVELS.indexOf(a as GroupPrivacyLevel) -
          PRIVACY_LEVELS.indexOf(b as GroupPrivacyLevel),
      )
      return ordered.map(([groupType, roles]) => ({
        groupType,
        roles: roles.map((role) => ({ ...role, memberCount: null })),
        untouchedGroupCount: untouched.get(groupType)?.untouchedIds.length ?? 0,
        // The denominator: "10 untouched" reads as "only 10 of them" without it, when it may
        // well be all of them.
        groupCount: untouched.get(groupType)?.total ?? 0,
      }))
    },
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
      const authorization = await requireCoverage(
        context,
        groupId,
        permissions,
        existing.permissions,
      )
      if (name === NONE_ROLE) {
        // The non-member role IS the group's visibility, so editing it is the type change.
        requirePrivacyCap(context, authorization, permissions)
      }
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
    removePostFromGroup: async (
      _parent,
      params: { groupId: string; postId: string },
      context: Context,
    ) => {
      const { groupId, postId } = params
      const now = new Date().toISOString()
      // One statement: drop the post's place in the group and notify its author, so a removal
      // can never happen silently. The post itself is untouched — it belongs to its author, and
      // deleting somebody else's writing is a different (network) matter.
      const result = await context.database.write({
        query: `
          MATCH (post:Post {id: $postId})-[edge:IN]->(group:Group {id: $groupId})
          MATCH (post)<-[:WROTE]-(author:User)
          DELETE edge
          WITH post, group, author
          MERGE (post)-[notification:NOTIFIED {reason: 'post_removed_from_group'}]->(author)
          ON CREATE SET notification.createdAt = $now, notification.updatedAt = $now,
                        notification.read = false
          SET notification.updatedAt = $now, notification.read = false
          RETURN post {.*} AS post
        `,
        variables: { groupId, postId, now },
      })
      const record = result.records[0]
      if (!record) {
        throw new UserInputError('That post is not in this group!')
      }
      return record.get('post') as Record<string, unknown>
    },
    updateGroupRoleTemplate: async (
      _parent,
      params: { groupType: string; name: string; permissions: string[]; label?: string | null },
      context: Context,
    ) => {
      const { groupType, name } = params
      const templates = await readGroupRoleTemplates(context.database)
      const existing = new Map(Object.entries(templates))
        .get(groupType)
        ?.find((role) => role.name === name)
      if (!existing) {
        throw new UserInputError('Unknown group role template!')
      }
      if (existing.protected && params.permissions.length > 0) {
        throw new UserInputError('The owner role holds every right and cannot be edited!')
      }
      const updated = {
        ...existing,
        label: validateLabel(params.label),
        permissions: existing.protected ? [] : sanitizeGroupPermissions(params.permissions),
      }
      // A template's NAME is a privacy level, and the level is derived from exactly these
      // rights — so a `public` template whose non-member role cannot read is a contradiction,
      // and every group created from it would be listed as something it is not. The operator
      // who wants that has the `closed` template for it.
      if (name === NONE_ROLE && privacyLevelOfPermissions(updated.permissions) !== groupType) {
        throw new UserInputError(
          'These rights would make this template a different group type than it is named!',
        )
      }
      await writeGroupRoleTemplate(
        context.database,
        groupType,
        updated,
        actorId(context),
        new Date().toISOString(),
      )
      // Deliberately no announce(): existing groups are untouched by a template change
      // (concept E12), so nobody's effective rights just changed.
      return { ...updated, memberCount: null }
    },
    applyGroupRoleTemplates: async (_parent, _args, context: Context) => {
      const [templates, untouched] = await Promise.all([
        readGroupRoleTemplates(context.database),
        untouchedGroupIdsByType(context.database),
      ])
      const byType = new Map(Object.entries(templates))
      const now = new Date().toISOString()
      let changed = 0
      for (const [groupType, groups] of untouched) {
        const template = byType.get(groupType)
        if (!template || template.length === 0) {
          continue
        }
        for (const groupId of groups.untouchedIds) {
          await replaceGroupRoles(
            context.database,
            groupId,
            template,
            USUAL_ROLE,
            actorId(context),
            now,
          )
          // The group's rights may well have changed, so its members need to refetch — but its
          // rolesCustomizedAt stays null: the group still runs on the template, it did not
          // choose anything.
          announce(context, groupId)
          changed += 1
        }
      }
      return changed
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
