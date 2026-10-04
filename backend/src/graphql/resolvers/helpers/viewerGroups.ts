import {
  visibilitiesWithNetworkAuthority,
  parseStoredPermissions,
  PENDING_ROLE,
  permissionsForGroupRole,
} from '@src/groupRole'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'

/**
 * What counts as an actual membership, as a Cypher condition rather than a list of names.
 *
 * It used to be the list `['usual', 'admin', 'owner']`, repeated in a dozen hand-written Cypher
 * strings. With group-defined roles that list is wrong by construction: a group that renames
 * `usual` would turn its own members into non-members everywhere the literal appears. The
 * question was never "which of these three names" — it is "is this edge a membership or an
 * application", so `role <> 'pending'` answers it for any role name a group invents.
 *
 * `none` needs no mention: it is the absence of the edge, so a viewer without a membership
 * never reaches this condition.
 */
export const PENDING_GROUP_ROLE = PENDING_ROLE

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
   * The VISIBILITIES whose content this viewer may read into WITHOUT a membership and without
   * the group granting it — the folded `group.content.read.any_<type>` network rights.
   *
   * `public` is deliberately NOT in here any more. It used to be, because "public" WAS the
   * statement "strangers may read this"; that statement is now the group's own
   * `group.content.read` for non-members, mirrored onto the node as `nonMemberContentRead`
   * (see groupRole/nonMemberAccess.ts). Keeping `public` in this list would override a public
   * group that closed its content — the type would decide again, which is the thing the rights
   * replace.
   */
  moderatorVisibilities: string[]
}

// Only what the viewer's network rights open up; bounded by the number of visibilitys, not by
// anything the database holds. A moderator holds `group.content.read.any_closed`, an admin
// additionally `_hidden` (#9405): the reported content they are asked to review stops being
// invisible to them, without a per-row lookup.
export const moderatorVisibilities = (context: Context): string[] =>
  visibilitiesWithNetworkAuthority('group.content.read', context.effectivePermissions).filter(
    // `public` cannot come from here: a public group that closed its content must not be
    // reopened by a right that quantifies over types (see the field doc above).
    (visibility) => visibility !== 'public',
  )

export const viewerScope = async (context: Context): Promise<ViewerScope> => ({
  viewerId: context.user?.id ?? null,
  contentGroupIds: (await groupReadScope(context)).contentGroupIds,
  moderatorVisibilities: moderatorVisibilities(context),
})
