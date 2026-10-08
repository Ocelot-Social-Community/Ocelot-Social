import { withFilter } from 'graphql-subscriptions'

import { GROUP_PERMISSIONS_CHANGED } from '@constants/subscriptions'
import { Errors } from '@graphql/errorRegistry'
import { AppError, UserInputError } from '@graphql/errors'
import { addUserToGroupChatRoom, removeUserFromGroupChatRoom } from '@graphql/resolvers/groups'
import { visibilityOf } from '@graphql/resolvers/helpers/groupAccessCypher'
import { groupPermissionCatalog, sanitizeGroupPermissions } from '@src/groupPermission'
import {
  coversRole,
  storableRightsFor,
  withImpliedRights,
  createPermissionForLevel,
  isMorePrivate,
  NONE_ROLE,
  OWNER_ROLE,
  PENDING_ROLE,
  permissionsForGroupRole,
  privacyLevelOfPermissions,
  SYSTEM_ROLE_NAMES,
  USUAL_ROLE,
} from '@src/groupRole'
import {
  clearElevation,
  deleteGroupRole,
  markGroupRolesCustomized,
  markGroupRolesUncustomized,
  memberCountsByRole,
  readElevation,
  readGroupRoles,
  readGroupRoleTemplates,
  readGroupTemplate,
  renameGroupRole,
  replaceGroupRoles,
  untouchedGroupIdsByTemplate,
  writeElevation,
  writeGroupRole,
  writeGroupTemplate,
  writeGroupRoleTemplate,
} from '@src/groupRole/repository'
import {
  byPrivacyThenName,
  readTemplateChoices,
  templateVisibilityOf,
} from '@src/groupRole/templateChoices'
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
// A sentence, not a name: long enough to say what one is doing, short enough to be shown with
// the record of the intervention.
const MAX_REASON_LENGTH = 280

const withMemberCounts = async (
  context: Context,
  groupId: string,
  roles: GroupRoleDefinition[],
) => {
  const counts = await memberCountsByRole(context.database, groupId)
  return roles.map((role) => ({
    ...role,
    // Which group the role is in, for the fields that answer per group (effectivePermissions).
    groupId,
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
    throw new AppError(Errors.GROUP_ROLE_NAME_UNKNOWN)
  }
  return role
}

const validateLabel = (label: string | null | undefined): string | null => {
  if (label === undefined || label === null || label === '') {
    return null
  }
  if (label.length > MAX_LABEL_LENGTH || label.trim() !== label) {
    throw new AppError(Errors.GROUP_ROLE_LABEL_INVALID)
  }
  return label
}

/**
 * Why somebody acts with their network rights in a group. Required: the elevation IS the record
 * of an intervention (concept E18), and "who, where, until when" without the why is a record the
 * group cannot make sense of later. Its own limit and its own message — told it is a role's
 * display name that is too long, somebody would look for the wrong field.
 */
const validateReason = (reason: string | null | undefined): string => {
  if (!reason?.trim()) {
    throw new AppError(Errors.GROUP_ELEVATION_REASON_MISSING)
  }
  if (reason.length > MAX_REASON_LENGTH || reason.trim() !== reason) {
    throw new AppError(Errors.GROUP_ELEVATION_REASON_INVALID, { max: MAX_REASON_LENGTH })
  }
  return reason
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
  if (!isMorePrivate(next, authorization.visibility as GroupPrivacyLevel)) {
    return
  }
  const needed = createPermissionForLevel(next)
  if (!needed || !hasNetworkPermission(context, needed)) {
    throw new AppError(Errors.GROUP_VISIBILITY_RAISE_NOT_PERMITTED)
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
  if (!authorization) {
    throw new AppError(Errors.GROUP_RIGHTS_GROUP_NOT_FOUND)
  }
  const held = new Set(existing)
  const added = new Set(permissions.filter((permission) => !held.has(permission)))
  if (!coversRole(authorization.effective, added)) {
    // Named, not just refused. A right can be missing from the actor's EFFECTIVE set without
    // being missing from their role — the network cap takes `group.videoCall.create` away in a
    // group whose door is restricted, for one — and "you cannot grant rights you do not hold"
    // sends whoever reads it looking in the wrong place.
    const missing = [...added].filter((permission) => !authorization.effective.has(permission))
    throw new AppError(Errors.GROUP_ROLE_PERMISSIONS_NOT_HELD, {
      permissions: missing.sort().join(', '),
    })
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
  /** Which visibility to show, or all of them when absent. */
  visibility?: string | null
  ownerless?: boolean | null
  disabled?: boolean | null
  first?: number | null
  offset?: number | null
}

/**
 * The visibilitys this viewer may administer.
 *
 * The list IS the authorization: a viewer holding only `group.administer.any_public` gets public
 * groups and nothing else, so a hidden group cannot be enumerated by asking for it.
 */
const administrableVisibilities = (context: Context): string[] =>
  ['public', 'closed', 'hidden'].filter((visibility) =>
    context.effectivePermissions.has(`group.administer.any_${visibility}` as PermissionKey),
  )

/**
 * The admin group list, and the count behind the same filters.
 *
 * Its own query rather than an option on `Query.Group`: that one answers "the groups I am in or
 * may see", this one answers "the groups I may administer", and conflating the two is how a
 * hidden group ends up in a listing it has no business being in.
 */
const adminGroupList = async (context: Context, params: AdminGroupFilter, countOnly = false) => {
  const types = administrableVisibilities(context)
  const asked = params.visibility
  const requested = asked ? [asked].filter((type) => types.includes(type)) : types
  if (requested.length === 0) {
    return countOnly ? 0 : []
  }
  const clauses = [`${visibilityOf('g')} IN $types`, 'coalesce(g.deleted, false) = false']
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
        untouchedGroupIdsByTemplate(context.database),
      ])
      // Least private first, ordered by what each template DERIVES to rather than by its name:
      // the tabs are a scale, an alphabet reads as "closed, secret, public", and sorting the
      // names against PRIVACY_LEVELS put `channel` — which is not a visibility — at -1.
      const ordered = [...Object.entries(templates)]
        .map(([name, roles]) => ({ name, visibility: templateVisibilityOf(roles), roles }))
        .sort(byPrivacyThenName)
      return ordered.map(({ name, visibility, roles }) => ({
        // The template's NAME and the visibility it produces answer two different questions —
        // one about the template an operator edits, one about the groups it creates. They are
        // the same string for the three named after a visibility, and `channel` is why they
        // are two fields.
        name,
        visibility,
        roles: roles.map((role) => ({ ...role, memberCount: null })),
        untouchedGroupCount: untouched.get(name)?.untouchedIds.length ?? 0,
        // The denominator: "10 untouched" reads as "only 10 of them" without it, when it may
        // well be all of them.
        groupCount: untouched.get(name)?.total ?? 0,
      }))
    },
    groupTemplates: async (_parent, _args, context: Context) =>
      (await readTemplateChoices(context.database)).map((choice) => ({
        ...choice,
        // A template's role belongs to no group, so nobody carries it.
        roles: choice.roles.map((role) => ({ ...role, memberCount: null })),
      })),
  },
  GroupRole: {
    // The role as the server weighs it when the viewer assigns it: capped by the same feature
    // gates and network rights as the viewer's own set. Comparing the viewer's capped set with a
    // role's raw list (as the member picker did) could never come out even — with video calls
    // switched off, nobody held what every member role lists, and every picker was locked.
    effectivePermissions: async (
      parent: { groupId?: string; name: string },
      _args,
      context: Context,
    ) => {
      if (!parent.groupId) {
        return null
      }
      const permissions = await context.groupAuthorization.rolePermissions(
        parent.groupId,
        parent.name,
      )
      return permissions ? [...permissions] : null
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
      // With the group it is in, or effectivePermissions could not tell it from a template role.
      return role ? { ...role, groupId: parent.id, memberCount: null } : null
    },
    myGroupElevation: async (parent: { id: string }, _args, context: Context) => {
      const authorization = await context.groupAuthorization.forGroup(parent.id)
      if (!authorization?.elevated) {
        return null
      }
      const elevation = await readElevation(context.database, parent.id, actorId(context))
      return elevation && { ...elevation, outranksMembers: authorization.outranksMembers }
    },
    mayElevateInGroup: async (parent: { id: string }, _args, context: Context) =>
      (await context.groupAuthorization.forGroup(parent.id))?.mayElevate ?? false,
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
          throw new AppError(Errors.GROUP_ROLE_OWNER_NOT_EDITABLE)
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
        return { ...relabelled, groupId, memberCount: null }
      }
      // The implications come FIRST: reading the content of a group one may not see is not a
      // state the product has, so granting it is also granting `group.read` — and both the
      // coverage check and the privacy cap have to judge what will actually be stored.
      const requested = withImpliedRights(sanitizeGroupPermissions(params.permissions))
      const authorization = await requireCoverage(context, groupId, requested, existing.permissions)
      if (name === NONE_ROLE) {
        // The non-member role IS the group's visibility, so editing it is the type change.
        requirePrivacyCap(context, authorization, requested)
      }
      // Applied AFTER the checks, not before: the rights a role cannot be without — and the ones
      // that cannot apply to it — are imposed by the model, not granted by the editor, so asking
      // them to hold `group.leave` themselves would refuse an edit over a right nobody chose
      // (see groupRole/mandatoryRights.ts).
      const permissions = storableRightsFor(name, requested)
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
        throw new AppError(Errors.GROUP_ROLE_NAME_INVALID)
      }
      if (SYSTEM_ROLE_NAMES.includes(name)) {
        throw new AppError(Errors.GROUP_ROLE_NAME_RESERVED)
      }
      const existing = await readGroupRoles(context.database, groupId)
      if (existing.some((role) => role.name === name)) {
        throw new AppError(Errors.GROUP_ROLE_NAME_ALREADY_TAKEN)
      }
      const requested = withImpliedRights(sanitizeGroupPermissions(params.permissions))
      await requireCoverage(context, groupId, requested)
      // A new role is a membership too, so it cannot be created without the right to end it —
      // and it cannot carry the rights that only mean something for a non-member.
      const permissions = storableRightsFor(name, requested)
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
      return { ...created, groupId, memberCount: 0 }
    },
    renameGroupRole: async (
      _parent,
      params: { groupId: string; name: string; newName: string },
      context: Context,
    ) => {
      const { groupId, name, newName } = params
      const existing = await requireRole(context, groupId, name)
      if (existing.system) {
        throw new AppError(Errors.GROUP_ROLE_SYSTEM_NOT_RENAMEABLE)
      }
      if (!ROLE_NAME_PATTERN.test(newName) || SYSTEM_ROLE_NAMES.includes(newName)) {
        throw new AppError(Errors.GROUP_ROLE_NAME_INVALID)
      }
      const roles = await readGroupRoles(context.database, groupId)
      if (roles.some((role) => role.name === newName)) {
        throw new AppError(Errors.GROUP_ROLE_NAME_ALREADY_TAKEN)
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
        throw new AppError(Errors.GROUP_ROLE_SYSTEM_NOT_DELETABLE)
      }
      // The members move to another MEMBERSHIP: `none` is the absence of one and `pending` is
      // waiting for one, so neither can take them in.
      if (reassignTo === name || reassignTo === NONE_ROLE || reassignTo === PENDING_ROLE) {
        throw new AppError(Errors.GROUP_ROLE_REASSIGN_TARGET_INVALID)
      }
      // Must exist, or its members would end up holding a role that is not there — which fails
      // closed to no rights at all, i.e. members silently locked out of their own group.
      const target = await requireRole(context, groupId, reassignTo)
      // Moving everybody into a role is handing that role out, so it asks what handing out a role
      // asks: that the actor holds all of it. Read off the role's EFFECTIVE set — the owner's
      // stored list is empty on purpose and would cover anybody. Not asked of the owner, as in
      // resetGroupRoles: they hold the whole catalog by definition, and their effective set lacks
      // only what is switched off network-wide — which would stop them for no reason at all.
      const authorization = await context.groupAuthorization.forGroup(groupId)
      if (authorization?.roleName !== OWNER_ROLE) {
        await requireCoverage(context, groupId, [...permissionsForGroupRole(target)])
      }
      const now = new Date().toISOString()
      await deleteGroupRole(context.database, groupId, name, reassignTo, now)
      await touched(context, groupId, now)
      return name
    },
    /**
     * Put a whole template on a group — the one it was created from by default, or any other.
     *
     * It used to look the template up by the group's current VISIBILITY, which worked only
     * while every template was named after one. It is not any more (`channel` is public too),
     * and a template nobody can name is a template nobody can reach — so the name is what is
     * asked for, and `Group.template` is what answers when nothing is.
     */
    resetGroupRoles: async (
      _parent,
      params: { groupId: string; template?: string | null },
      context: Context,
    ) => {
      const { groupId } = params
      const authorization = await context.groupAuthorization.forGroup(groupId)
      if (!authorization) {
        throw new AppError(Errors.GROUP_RIGHTS_GROUP_NOT_FOUND)
      }
      const templates = await readGroupRoleTemplates(context.database)
      const name = params.template ?? (await readGroupTemplate(context.database, groupId))
      const template = new Map(Object.entries(templates)).get(name)
      if (!template || template.length === 0) {
        throw new AppError(Errors.GROUP_TEMPLATE_NAME_UNKNOWN, { template: name })
      }
      // Applying a template rewrites the non-member role, which IS the group's visibility — so
      // the same cap that guards editing that role by hand guards it here (E10). Without it,
      // "apply the secret template" would be the way around `group.create_hidden`.
      const nonMember = template.find((role) => role.name === NONE_ROLE)
      requirePrivacyCap(context, authorization, [...(nonMember?.permissions ?? [])])
      // And the coverage rule of updateGroupRole, role by role: a template may not hand out a
      // right the actor does not hold. Otherwise somebody given `group.role.manage` in a role the
      // owner had trimmed could apply a template and so restore their own role — and every
      // other — to the template's fuller set. What is checked is what each role GAINS, as there.
      // The owner holds the whole catalog by definition and is not asked: their effective set
      // lacks the rights switched off network-wide, and asking would stop them from applying
      // any template on a network without, say, LiveKit.
      if (authorization.roleName !== OWNER_ROLE) {
        const current = new Map(
          (await readGroupRoles(context.database, groupId)).map((role) => [
            role.name,
            role.permissions,
          ]),
        )
        for (const role of template) {
          if (role.name === OWNER_ROLE) {
            continue
          }
          await requireCoverage(
            context,
            groupId,
            [...role.permissions],
            current.get(role.name) ?? [],
          )
        }
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
      // The group now runs on the template it was given, which is what the admin area counts
      // when it says how many groups an edit would reach.
      await writeGroupTemplate(context.database, groupId, name)
      // ...and runs on it unedited, so a later change to that template reaches it again.
      await markGroupRolesUncustomized(context.database, groupId)
      announce(context, groupId)
      return groupRoles(context, groupId)
    },
    setGroupMemberRole: async (
      _parent,
      params: { groupId: string; userId: string; roleName: string },
      context: Context,
    ) => {
      const { groupId, userId, roleName } = params
      // `none` is the absence of a membership, not a role to hold on one: written onto an edge it
      // would count as a membership everywhere while answering as none.
      if (roleName === NONE_ROLE) {
        throw new AppError(Errors.GROUP_ROLE_NAME_INVALID)
      }
      // Authorization (the right, dominance, coverage) is the shield's job; what is left here
      // is that the role exists, and keeping the group's chat room in step with membership.
      await requireRole(context, groupId, roleName)
      const now = new Date().toISOString()
      const session = context.driver.session()
      let record: { get: (key: string) => unknown } | undefined
      try {
        record = await session.writeTransaction(async (transaction) => {
          const result = await transaction.run(
            `
              MATCH (member:User {id: $userId})
              MATCH (group:Group {id: $groupId})
              MERGE (member)-[membership:MEMBER_OF]->(group)
              ON CREATE SET membership.createdAt = $now
              SET membership.role = $roleName, membership.updatedAt = $now
              RETURN member {.*} AS user, membership {.*} AS membership
            `,
            { groupId, userId, roleName, now },
          )
          const row = result.records[0]
          // The group's chat room follows the membership, in the same transaction: an applicant
          // is not in it, every other role is (as ChangeGroupMemberRole keeps it).
          if (row) {
            await (roleName === PENDING_ROLE
              ? removeUserFromGroupChatRoom(transaction, groupId, userId)
              : addUserToGroupChatRoom(transaction, groupId, userId))
          }
          return row
        })
      } finally {
        await session.close()
      }
      if (!record) {
        throw new AppError(Errors.GROUP_MEMBERSHIP_USER_OR_GROUP_NOT_FOUND)
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
        throw new AppError(Errors.GROUP_POST_REMOVE_POST_NOT_IN_GROUP)
      }
      return record.get('post') as Record<string, unknown>
    },
    updateGroupRoleTemplate: async (
      _parent,
      params: { template: string; name: string; permissions: string[]; label?: string | null },
      context: Context,
    ) => {
      const { name, template: visibility } = params
      const templates = await readGroupRoleTemplates(context.database)
      const templateRoles = new Map(Object.entries(templates)).get(visibility) ?? []
      const existing = templateRoles.find((role) => role.name === name)
      if (!existing) {
        throw new AppError(Errors.GROUP_TEMPLATE_ROLE_UNKNOWN)
      }
      if (existing.protected && params.permissions.length > 0) {
        throw new AppError(Errors.GROUP_ROLE_OWNER_NOT_EDITABLE)
      }
      const updated = {
        ...existing,
        label: validateLabel(params.label),
        permissions: existing.protected
          ? []
          : storableRightsFor(
              name,
              withImpliedRights(sanitizeGroupPermissions(params.permissions)),
            ),
      }
      // A template derives to a privacy level from exactly these rights, and the three named
      // after one say so in their name — so a `public` template whose non-member role cannot
      // read is a contradiction, and every group created from it would be listed as something it
      // is not. The level is the one the template derives to NOW, not its name: `channel` is a
      // public template that is not called `public`, and editing it must not be refused for that.
      const derivedNow = templateVisibilityOf(templateRoles)
      if (name === NONE_ROLE && privacyLevelOfPermissions(updated.permissions) !== derivedNow) {
        throw new AppError(Errors.GROUP_TEMPLATE_PERMISSIONS_VISIBILITY_MISMATCH)
      }
      await writeGroupRoleTemplate(
        context.database,
        visibility,
        updated,
        actorId(context),
        new Date().toISOString(),
      )
      // Deliberately no announce(): existing groups are untouched by a template change
      // (concept E12), so nobody's effective rights just changed.
      return { ...updated, memberCount: null }
    },
    elevateInGroup: async (
      _parent,
      params: { groupId: string; reason: string },
      context: Context,
    ) => {
      const { groupId } = params
      const authorization = await context.groupAuthorization.forGroup(groupId)
      if (!authorization) {
        throw new AppError(Errors.GROUP_RIGHTS_GROUP_NOT_FOUND)
      }
      // Nothing to pick up means nothing to confirm: a viewer whose network rights give them
      // only reading here would otherwise be handed a button that changes nothing.
      if (!authorization.mayElevate) {
        throw new AppError(Errors.GROUP_ELEVATION_RIGHTS_MISSING)
      }
      const actor = actorId(context)
      const elevation = await writeElevation(
        context.database,
        groupId,
        actor,
        validateReason(params.reason),
      )
      // The record is the switch AND the log entry (concept E18): who, where, why, until when.
      // eslint-disable-next-line no-console
      console.log(
        `group elevation: ${actor} picked up network rights in ${groupId} until ${elevation.expiresAt}`,
      )
      announce(context, groupId)
      // From the authorization read before the elevation existed, so it is the rights it rests
      // on that answer here, not `outranksMembers` (which needs the elevation already in place).
      return { ...elevation, outranksMembers: authorization.administersByNetwork }
    },
    endGroupElevation: async (_parent, params: { groupId: string }, context: Context) => {
      const ended = await clearElevation(context.database, params.groupId, actorId(context))
      if (ended) {
        announce(context, params.groupId)
      }
      return ended
    },
    applyGroupRoleTemplates: async (_parent, _args, context: Context) => {
      const [templates, untouched] = await Promise.all([
        readGroupRoleTemplates(context.database),
        untouchedGroupIdsByTemplate(context.database),
      ])
      const byType = new Map(Object.entries(templates))
      const now = new Date().toISOString()
      let changed = 0
      for (const [visibility, groups] of untouched) {
        const template = byType.get(visibility)
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
