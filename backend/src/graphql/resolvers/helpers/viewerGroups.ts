import {
  visibilitiesWithNetworkAuthority,
  parseStoredPermissions,
  permissionsForGroupRole,
} from '@src/groupRole'

import { visibilityOf } from './groupAccessCypher'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'

const MEMBER_READ_SCOPE_QUERY = `
  MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group:Group)
  OPTIONAL MATCH (group)-[:HAS_GROUP_ROLE]->(role:GroupRole {name: membership.role})
  RETURN group.id AS groupId, membership.role AS roleName, role.permissions AS permissions
`

/**
 * What the viewer's role in one group grants them.
 *
 * Through `permissionsForGroupRole`, because that is where the `owner` exception lives: the
 * owner role stores an EMPTY list and resolves to the whole catalog, so reading the stored
 * list alone would hide an owner's own group from them.
 *
 * A role the group has no definition for grants NOTHING here — the same answer the shield
 * gives it, rather than a second, more generous one. That used to be a fallback to the
 * pre-rights behaviour for a database mid-migration; the boot repair
 * (`seedRolesForGroupsWithoutRoles`) makes that state go away instead, which is better than
 * two layers disagreeing about what a broken row means.
 */
const heldByRole = (roleName: string, stored: string | null): Set<GroupPermissionKey> =>
  permissionsForGroupRole({
    name: roleName,
    label: null,
    system: false,
    protected: false,
    permissions: stored === null ? [] : parseStoredPermissions(stored),
  })

/** What the viewer may read: by their own role, and by a network right that needs no membership. */
export interface GroupReadScope {
  /** Group ids whose profile the viewer may read (`group.read`). */
  readableGroupIds: string[]
  /** Group ids whose posts and comments the viewer may read (`group.content.read`). */
  contentGroupIds: string[]
  /**
   * The VISIBILITIES whose groups the viewer may read into WITHOUT being a member — the folded
   * `group.administer.any_<type>` / `group.content.read.any_<type>` / `group.moderate.any_<type>`
   * rights (see groupRole/networkAuthority.ts).
   *
   * A list of visibilities, not of ids: bounded by the three levels instead of by the database,
   * which is what lets a many-groups query ask it. Without this, a network admin could open a
   * hidden group through the per-group authorization (which folds the same rights) and get a
   * 404 from the query that lists it — one answer per shape, which is the bug this closes.
   */
  readableVisibilities: string[]
}

/**
 * The groups the viewer may read by virtue of their membership, resolved ONCE per request and
 * handed to the filter wrappers rather than asked per candidate post. The viewer's memberships
 * do not change while a query runs, so looking them up inside the row loop is pure repetition —
 * and a measurable one: profiled against 20.000 posts, the per-post form costs 1.480.665 db
 * hits where the hoisted form costs 348.020.
 *
 * The result is bounded by how many groups a person joins, not by the size of the database.
 * That is what separates it from the id lists this code used to build: `filterInvisiblePosts`
 * once collected every post id the viewer must not see, which for an anonymous visitor was
 * every post in every non-public group.
 *
 * It used to be one list — "the groups I am an active member of" — because membership WAS the
 * answer. It is two lists now because the role decides, and a group may grant reading its
 * content to its applicants or withhold it from its members.
 *
 * Anonymous viewers hold no memberships, so they skip the query entirely.
 */
export const groupReadScope = async (context: Context): Promise<GroupReadScope> => {
  // Anonymous first: a visitor holds no membership AND no network right, so there is nothing
  // to look up in either direction.
  if (!context.user) {
    return { readableGroupIds: [], contentGroupIds: [], readableVisibilities: [] }
  }
  const readableVisibilities = visibilitiesWithNetworkAuthority(
    'group.read',
    context.effectivePermissions,
  )
  const result = await context.database.query({
    query: MEMBER_READ_SCOPE_QUERY,
    variables: { userId: context.user.id },
  })
  const readableGroupIds: string[] = []
  const contentGroupIds: string[] = []
  for (const record of result.records) {
    const groupId = record.get('groupId') as string
    const held = heldByRole(
      record.get('roleName') as string,
      record.get('permissions') as string | null,
    )
    if (held.has('group.read')) {
      readableGroupIds.push(groupId)
    }
    if (held.has('group.content.read')) {
      contentGroupIds.push(groupId)
    }
  }
  return { readableGroupIds, contentGroupIds, readableVisibilities }
}

/**
 * What the post visibility rule needs to know about the viewer.
 *
 * Travels as one value through the filter wrappers so that the id and the group list cannot be
 * passed on separately and get out of step — they answer the same question.
 */
export interface ViewerScope {
  /** `null` for an anonymous visitor. */
  viewerId: string | null
  /** The groups whose content the viewer's own role opens (see {@link groupReadScope}). */
  contentGroupIds: string[]
  /**
   * The groups this viewer may read into WITHOUT a membership and without the group granting
   * it: a network right covers the group (`group.content.read.any_<type>`, or the
   * `group.moderate` / `group.administer` families that fold it in) AND the viewer has a live
   * elevation there (`ELEVATED_IN`, groupRole/elevation.ts).
   *
   * Ids, not visibilities. This used to be the list of TYPES a network right covers, which made
   * every hidden group's content part of a network admin's feed without them ever opening one
   * (#10506). Reading into a group is asked for group by group, so the list is bounded by the
   * elevations a viewer holds at once, not by the database.
   *
   * This is what the viewer MAY read, not what every list shows: `filterInvisiblePosts` applies
   * it only to a request that names one group or one post, so the content does not travel into
   * the feed even while the elevation lasts.
   */
  elevatedGroupIds: string[]
}

const ELEVATED_READ_SCOPE_QUERY = `
  MATCH (:User {id: $userId})-[e:ELEVATED_IN]->(group:Group)
  WHERE e.expiresAt > datetime()
    AND ${visibilityOf('group')} IN $visibilities
  RETURN group.id AS groupId
`

/**
 * The groups with a live elevation whose content the viewer's network rights cover.
 *
 * Both halves are needed. The elevation alone is not enough: it outlives a right withdrawn from
 * the viewer's role, and a group can turn hidden while it runs. The right alone is what this
 * replaces. Without a right that could read anything, the query is skipped — which is everybody
 * but the moderators and admins.
 */
export const elevatedReadScope = async (context: Context): Promise<string[]> => {
  if (!context.user) {
    return []
  }
  const visibilities = visibilitiesWithNetworkAuthority(
    'group.content.read',
    context.effectivePermissions,
  )
  if (visibilities.length === 0) {
    return []
  }
  const result = await context.database.query({
    query: ELEVATED_READ_SCOPE_QUERY,
    variables: { userId: context.user.id, visibilities },
  })
  return result.records.map((record) => record.get('groupId') as string)
}

export const viewerScope = async (context: Context): Promise<ViewerScope> => {
  const [{ contentGroupIds }, elevatedGroupIds] = await Promise.all([
    groupReadScope(context),
    elevatedReadScope(context),
  ])
  return { viewerId: context.user?.id ?? null, contentGroupIds, elevatedGroupIds }
}
