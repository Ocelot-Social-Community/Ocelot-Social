import { parseStoredPermissions, PENDING_ROLE } from '@src/groupRole'

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
 * What a membership grants when the group has no definition for its role — a group that
 * predates the roles, or a half-applied migration.
 *
 * Deliberately NOT the empty set, although that is what the shield does with an unknown role
 * (`permissionsForGroupRole(null)`): this list decides what a member can still SEE, and a
 * database mid-migration must not take a group's content away from the people in it. So the
 * fallback is the behaviour from before the rights existed — an applicant sees the group, a
 * member also sees its content.
 */
const fallbackPermissions = (roleName: string): GroupPermissionKey[] =>
  roleName === PENDING_ROLE ? ['group.read'] : ['group.read', 'group.content.read']

/** Which groups the viewer's OWN role lets them read — profile and content, separately. */
export interface GroupReadScope {
  /** Group ids whose profile the viewer may read (`group.read`). */
  readableGroupIds: string[]
  /** Group ids whose posts and comments the viewer may read (`group.content.read`). */
  contentGroupIds: string[]
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
  if (!context.user) {
    return { readableGroupIds: [], contentGroupIds: [] }
  }
  const result = await context.database.query({
    query: MEMBER_READ_SCOPE_QUERY,
    variables: { userId: context.user.id },
  })
  const readableGroupIds: string[] = []
  const contentGroupIds: string[] = []
  for (const record of result.records) {
    const groupId = record.get('groupId') as string
    const stored = record.get('permissions') as string | null
    const held = new Set<GroupPermissionKey>(
      stored === null
        ? fallbackPermissions(record.get('roleName') as string)
        : parseStoredPermissions(stored),
    )
    if (held.has('group.read')) {
      readableGroupIds.push(groupId)
    }
    if (held.has('group.content.read')) {
      contentGroupIds.push(groupId)
    }
  }
  return { readableGroupIds, contentGroupIds }
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
   * The group TYPES whose content this viewer may read into WITHOUT a membership and without
   * the group granting it — the folded `group.content.read.any_<type>` network rights.
   *
   * `public` is deliberately NOT in here any more. It used to be, because "public" WAS the
   * statement "strangers may read this"; that statement is now the group's own
   * `group.content.read` for non-members, mirrored onto the node as `nonMemberContentRead`
   * (see groupRole/nonMemberAccess.ts). Keeping `public` in this list would override a public
   * group that closed its content — the type would decide again, which is the thing the rights
   * replace.
   */
  moderatorGroupTypes: string[]
}

// Only what the viewer's network rights open up; bounded by the number of group types, not by
// anything the database holds. A moderator holds `group.content.read.any_closed`, an admin
// additionally `_hidden` (#9405): the reported content they are asked to review stops being
// invisible to them, without a per-row lookup.
export const moderatorGroupTypes = (context: Context): string[] =>
  ['closed', 'hidden'].filter((groupType) =>
    context.effectivePermissions.has(
      `group.content.read.any_${groupType}` as Parameters<
        Context['effectivePermissions']['has']
      >[0],
    ),
  )

export const viewerScope = async (context: Context): Promise<ViewerScope> => ({
  viewerId: context.user?.id ?? null,
  contentGroupIds: (await groupReadScope(context)).contentGroupIds,
  moderatorGroupTypes: moderatorGroupTypes(context),
})
