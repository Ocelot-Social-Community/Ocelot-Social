// Resolving "what may this viewer do in that group" once per request.
//
// One indexed statement per (request, group): the group's type, the viewer's role and that
// role's definition, in a single round trip. The answer is memoised for the request, because
// a mutation typically asks the same question two or three times (the shield rule, then the
// resolver) and the viewer's membership cannot change while one request runs.
//
// Deliberately NOT a process-wide cache the way the network roles have one: those are a
// handful of global objects, whereas group roles scale with the number of groups. A read per
// request against an indexed lookup is the cheaper trade — and it cannot go stale.
import { visibilityOf } from '@graphql/resolvers/helpers/groupAccessCypher'
import { GROUPS_ENABLED_GATE } from '@src/groupPermission'

import { callDoorFrom } from './callDoor'
import { authoritySourceFor, effectiveGroupPermissions } from './effective'
import { withElevation } from './elevation'
import { administersByNetwork, networkAuthorityIn } from './networkAuthority'
import { parseStoredPermissions } from './storedPermissions'
import { isActiveMembershipRole, NONE_ROLE, OWNER_ROLE } from './types'

import type { CallDoor } from './callDoor'
import type { AuthoritySource, GroupRoleDefinition } from './types'
import type databaseContext from '@context/database'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'
import type { PolicyKey } from '@src/policy'

type DbContext = ReturnType<typeof databaseContext>

/** What the viewer may do in one group, plus the facts that produced the answer. */
export interface GroupAuthorization {
  groupId: string
  /** How findable the group is — derived, never stored (./privacyLevel.ts). */
  visibility: string
  /** The viewer's role name, or `none` when they have no membership edge. */
  roleName: string
  /** An ACTIVE membership: neither `none` nor `pending`. */
  isMember: boolean
  /**
   * Whether the group actually defines the role this viewer carries.
   *
   * `false` means the group predates the group roles, or a migration is half applied — not
   * "the role grants nothing", which is a legitimate answer (a hidden group's non-member role).
   * The few decisions that cannot simply fail closed, because failing closed would CHANGE what
   * people may do while a deployment is mid-migration, read this to fall back to the old
   * visibility behaviour.
   */
  hasRoleDefinition: boolean
  /** Whether the viewer asked to act with their network rights here, and the ask still stands. */
  elevated: boolean
  /** Whether such an ask would grant anything beyond reading (./elevation.ts). */
  mayElevate: boolean
  /**
   * Whether the viewer's network rights ADMINISTER groups of this visibility — what an elevation
   * here rests on when it is to put them above every member (./networkAuthority.ts).
   */
  administersByNetwork: boolean
  /**
   * Whether the viewer stands above EVERY member of this group, owners included: an elevation
   * that rests on `group.administer.any_<visibility>`. Inside the group nobody outranks an owner
   * — peers cannot act on each other — so a group with an owner who abuses it or is gone could
   * otherwise only be switched off as a whole, never handed back (./authority.ts).
   */
  outranksMembers: boolean
  /** Whether a stranger could walk into this group — the video call cap (./callDoor.ts). */
  callDoor: CallDoor
  effective: ReadonlySet<GroupPermissionKey>
  has: (permission: GroupPermissionKey) => boolean
  /** Where a held right comes from — membership or a network right (concept E16/E18). */
  sourceOf: (permission: GroupPermissionKey) => AuthoritySource | null
}

export interface GroupAuthorizationScope {
  /** null when the group does not exist. */
  forGroup: (groupId: string) => Promise<GroupAuthorization | null>
  /** null when the post does not exist or is not in a group. */
  forPost: (postId: string) => Promise<GroupAuthorization | null>
  /** null when the room does not exist or is not a group room. */
  forRoom: (roomId: string) => Promise<GroupAuthorization | null>
  /** The role name another user currently carries in that group, or `none` without one. */
  forGroupMemberRole: (groupId: string, userId: string) => Promise<string>
  /**
   * What ANOTHER member of that group currently holds — the target side of the act-on rules.
   * A user with no membership resolves to the group's `none` role, which is the right answer
   * for "may I add this person": they are the weakest party, not an absent one.
   */
  memberPermissions: (groupId: string, userId: string) => Promise<Set<GroupPermissionKey>>
  /**
   * What a named role of that group would grant, filtered by the same gates and the ACTOR's
   * network rights — the "assigned role" side of the coverage rule. Filtering both sides the
   * same way is what keeps a right that is switched off network-wide (an ungated video call,
   * say) from blocking an otherwise legitimate role assignment.
   */
  rolePermissions: (groupId: string, roleName: string) => Promise<Set<GroupPermissionKey> | null>
}

interface ScopeDependencies {
  database: DbContext
  userId: string | null
  /** The viewer's effective NETWORK permissions, for the hard cap. */
  effectivePermissions: ReadonlySet<PermissionKey>
  policy: { getEffective: (key: PolicyKey) => unknown }
}

const AUTHORIZATION_QUERY = `
  MATCH (g:Group {id: $groupId})
  OPTIONAL MATCH (:User {id: $userId})-[m:MEMBER_OF]->(g)
  // A live elevation: the viewer asked to act with their network rights in THIS group, and the
  // ask has not lapsed yet (groupRole/elevation.ts).
  OPTIONAL MATCH (:User {id: $userId})-[e:ELEVATED_IN]->(g)
  WHERE e.expiresAt > datetime()
  WITH g, m, e
  WITH g, coalesce(m.role, $noneRole) AS roleName, e IS NOT NULL AS elevated
  OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: roleName})
  // The group's floor, read alongside the viewer's own role: whatever the non-member role
  // grants, the group grants to everybody, so nobody inside it holds less than a stranger
  // (groupRole/mandatoryRights.ts, floorFromNonMemberRole). One extra optional match on the
  // same node, not a second round trip.
  OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(nonMemberRole:GroupRole {name: $noneRole})
  RETURN ${visibilityOf('g')} AS visibility,
         elevated AS elevated,
         // The door columns, failing closed where they were never written (nonMemberAccess.ts).
         coalesce(g.nonMemberRead, false) AS nonMemberRead,
         coalesce(g.nonMemberJoin, false) AS nonMemberJoin,
         roleName AS roleName,
         r.name AS name,
         r.label AS label,
         r.system AS system,
         r.protected AS protected,
         r.permissions AS permissions,
         nonMemberRole.permissions AS nonMemberPermissions
`

const MEMBER_ROLE_QUERY = `
  MATCH (g:Group {id: $groupId})
  OPTIONAL MATCH (:User {id: $userId})-[m:MEMBER_OF]->(g)
  WITH g, coalesce(m.role, $noneRole) AS roleName
  OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: roleName})
  RETURN roleName AS roleName, r.name AS name, r.protected AS protected,
         r.permissions AS permissions
`

const ROLE_QUERY = `
  MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $roleName})
  RETURN r.name AS name, r.protected AS protected, r.permissions AS permissions
`

const GROUP_OF_POST_QUERY = `
  MATCH (p:Post {id: $postId})-[:IN]->(g:Group)
  RETURN g.id AS groupId
`

const GROUP_OF_ROOM_QUERY = `
  MATCH (:Room {id: $roomId})-[:ROOM_FOR]->(g:Group)
  RETURN g.id AS groupId
`

/**
 * Build the per-request scope. Called once while the context is assembled, so the memo it
 * keeps lives exactly as long as the request — it closes over this viewer's id and can never
 * serve one viewer's answer to another.
 */
export function createGroupAuthorizationScope({
  database,
  userId,
  effectivePermissions,
  policy,
}: ScopeDependencies): GroupAuthorizationScope {
  const byGroupId = new Map<string, Promise<GroupAuthorization | null>>()
  const groupIdByPostId = new Map<string, Promise<string | null>>()
  const groupIdByRoomId = new Map<string, Promise<string | null>>()

  // The gate reader the group permission module expects. Wrapped rather than handed over
  // directly, because PolicyService types its keys and this seam speaks plain strings.
  const gateContext = {
    policy: {
      getEffective: (key: string): boolean => policy.getEffective(key as PolicyKey) === true,
    },
  }

  // What a network right grants in a group of this type — the shared fold, so the per-request
  // answer and the list queries cannot disagree about it (see ./networkAuthority.ts).
  const resolveGroup = async (groupId: string): Promise<GroupAuthorization | null> => {
    const result = await database.query({
      query: AUTHORIZATION_QUERY,
      variables: { groupId, userId, noneRole: NONE_ROLE },
    })
    const record = result.records[0]
    if (!record) {
      return null
    }
    const roleName = record.get('roleName') as string
    const storedName = record.get('name') as string | null
    // No GroupRole node for this name: a group that predates the migration, or a half-applied
    // one. permissionsForGroupRole(null) is the empty set, so the viewer may do nothing here
    // rather than everything.
    const role: GroupRoleDefinition | null = storedName
      ? {
          name: storedName,
          label: (record.get('label') as string | null) ?? null,
          system: Boolean(record.get('system')),
          protected: Boolean(record.get('protected')),
          permissions: parseStoredPermissions(record.get('permissions') as string | null),
        }
      : null
    const nonMemberPermissions = parseStoredPermissions(
      record.get('nonMemberPermissions') as string | null,
    )
    const visibility = record.get('visibility') as string
    // Whether a stranger could walk into this group, which is what caps opening a video call
    // (groupRole/callDoor.ts) — read off the group node rather than from its `none` role,
    // because the role this query loads is the VIEWER's.
    const callDoor = callDoorFrom({
      nonMemberRead: record.get('nonMemberRead') === true,
      nonMemberJoin: record.get('nonMemberJoin') === true,
    })
    // What a network right grants in a group of this visibility — the shared fold, so the
    // per-request answer and the list queries cannot disagree about it (networkAuthority.ts).
    // Narrowed to reading until the viewer has asked for it HERE (elevation.ts): holding the
    // right is not the same as using it.
    const elevated = record.get('elevated') === true
    const fullNetworkAuthority = networkAuthorityIn(visibility, effectivePermissions)
    const administers = administersByNetwork(visibility, effectivePermissions)
    const networkAuthority = withElevation(fullNetworkAuthority, elevated)
    const effective = effectiveGroupPermissions({
      role,
      roleName,
      networkAuthority,
      networkEffective: effectivePermissions,
      nonMemberPermissions,
      callDoor,
      gateContext,
    })
    // A membership whose role the group does not define must still be LEAVABLE. Everything
    // else fails closed there (permissionsForGroupRole(null) is the empty set), and
    // `LeaveGroup` is checked against `group.leave` like any other right — so without this
    // one exception a damaged row would mean a group its member cannot get out of. Only
    // leaving, and only with a membership: granting `group.join` here would turn a group whose
    // roles are missing into one anybody may walk into.
    const effectiveWithEscape =
      role === null && roleName !== NONE_ROLE ? new Set(effective).add('group.leave') : effective

    /**
     * What an elevation would ADD on top of what the viewer already holds — the question the
     * offer has to answer. Computed by resolving the same effective set with the full network
     * authority, because the fold is capped by prerequisites and gates and a raw set difference
     * would promise rights that are not effective anyway.
     */
    const elevationWouldAdd = (held: ReadonlySet<GroupPermissionKey>): boolean => {
      if (fullNetworkAuthority.size === 0) {
        return false
      }
      const withRights = effectiveGroupPermissions({
        role,
        roleName,
        networkAuthority: fullNetworkAuthority,
        networkEffective: effectivePermissions,
        nonMemberPermissions,
        callDoor,
        gateContext,
      })
      return [...withRights].some((permission) => !held.has(permission))
    }

    return {
      groupId,
      visibility,
      roleName,
      isMember: isActiveMembershipRole(roleName),
      // Whether the group has a definition for this viewer's role at all. False for a group
      // that predates the roles or a half-applied migration, which a caller cannot tell from
      // "a role that grants nothing" (a hidden group's non-member role) without being told.
      hasRoleDefinition: role !== null,
      /** Whether the viewer has asked to act with their network rights in this group. */
      elevated,
      /**
       * Whether asking would give them anything they do not already hold HERE. An owner holds
       * the whole catalog through their membership, so the network right adds nothing and the
       * offer would be noise; a moderator who is not a member sees it.
       */
      mayElevate: !elevated && elevationWouldAdd(effectiveWithEscape),
      administersByNetwork: administers,
      outranksMembers: elevated && administers,
      callDoor,
      effective: effectiveWithEscape,
      has: (permission) => effectiveWithEscape.has(permission),
      sourceOf: (permission) =>
        authoritySourceFor(permission, role, networkAuthority, nonMemberPermissions, roleName),
    }
  }

  const forGroup = async (groupId: string): Promise<GroupAuthorization | null> => {
    const cached = byGroupId.get(groupId)
    if (cached) {
      return cached
    }
    const pending = resolveGroup(groupId)
    byGroupId.set(groupId, pending)
    return pending
  }

  const viaLookup = (
    cache: Map<string, Promise<string | null>>,
    query: string,
    variableName: string,
  ) => {
    return async (id: string): Promise<GroupAuthorization | null> => {
      const cached = cache.get(id)
      const lookup =
        cached ??
        database
          .query({ query, variables: { [variableName]: id } })
          .then((result) => (result.records[0]?.get('groupId') as string | undefined) ?? null)
      if (!cached) {
        cache.set(id, lookup)
      }
      const groupId = await lookup
      return groupId === null ? null : forGroup(groupId)
    }
  }

  // Both of the two below resolve a role of the SAME group, so they share the fact the cap is
  // resolved against — the door — with whatever forGroup already read. Resolving it differently
  // is how a right that is capped for everybody in this group starts blocking a role assignment
  // on one side of the comparison only.
  const groupScopeOf = async (groupId: string): Promise<{ callDoor: CallDoor } | null> => {
    const authorization = await forGroup(groupId)
    return authorization ? { callDoor: authorization.callDoor } : null
  }

  const definitionFrom = (record: {
    get: (key: string) => unknown
  }): GroupRoleDefinition | null => {
    const name = record.get('name') as string | null
    return name
      ? {
          name,
          label: null,
          system: false,
          protected: Boolean(record.get('protected')),
          permissions: parseStoredPermissions(record.get('permissions') as string | null),
        }
      : null
  }

  const forGroupMemberRole = async (groupId: string, targetUserId: string): Promise<string> => {
    const result = await database.query({
      query: `MATCH (g:Group {id: $groupId})
              OPTIONAL MATCH (:User {id: $userId})-[m:MEMBER_OF]->(g)
              RETURN coalesce(m.role, $noneRole) AS roleName`,
      variables: { groupId, userId: targetUserId, noneRole: NONE_ROLE },
    })
    return (result.records[0]?.get('roleName') as string | undefined) ?? NONE_ROLE
  }

  const memberPermissions = async (
    groupId: string,
    targetUserId: string,
  ): Promise<Set<GroupPermissionKey>> => {
    const scope = await groupScopeOf(groupId)
    if (scope === null) {
      return new Set()
    }
    const result = await database.query({
      query: MEMBER_ROLE_QUERY,
      variables: { groupId, userId: targetUserId, noneRole: NONE_ROLE },
    })
    const record = result.records[0]
    if (!record) {
      return new Set()
    }
    return effectiveGroupPermissions({
      role: definitionFrom(record),
      roleName: record.get('roleName') as string,
      networkEffective: effectivePermissions,
      ...scope,
      gateContext,
    })
  }

  const rolePermissions = async (
    groupId: string,
    roleName: string,
  ): Promise<Set<GroupPermissionKey> | null> => {
    const scope = await groupScopeOf(groupId)
    if (scope === null) {
      return null
    }
    const result = await database.query({
      query: ROLE_QUERY,
      variables: { groupId, roleName },
    })
    const record = result.records[0]
    if (!record) {
      return null
    }
    const definition = definitionFrom(record)
    if (!definition) {
      return null
    }
    // The owner role stores no list and resolves to the whole catalog — which is what makes
    // "you may only assign what you hold" refuse an admin who tries to appoint an owner.
    const role = definition.protected ? { ...definition, name: OWNER_ROLE } : definition
    return effectiveGroupPermissions({
      role,
      networkEffective: effectivePermissions,
      ...scope,
      gateContext,
    })
  }

  return {
    forGroup,
    forPost: viaLookup(groupIdByPostId, GROUP_OF_POST_QUERY, 'postId'),
    forRoom: viaLookup(groupIdByRoomId, GROUP_OF_ROOM_QUERY, 'roomId'),
    forGroupMemberRole,
    memberPermissions,
    rolePermissions,
  }
}

// Re-exported so the shield can name the policy that switches the whole feature off without
// reaching into the permission module for it.
export { GROUPS_ENABLED_GATE }
