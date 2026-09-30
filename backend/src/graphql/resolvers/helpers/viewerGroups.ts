import type { Context } from '@src/context'

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
export const PENDING_GROUP_ROLE = 'pending'

/**
 * The ids of the groups the viewer is an active member of.
 *
 * Resolved ONCE per request and handed to the filter wrappers, rather than asked per candidate
 * post. The viewer's memberships do not change while a query runs, so looking them up inside
 * the row loop is pure repetition — and a measurable one: profiled against 20.000 posts, the
 * per-post form costs 1.480.665 db hits where the hoisted form costs 348.020.
 *
 * The result is bounded by how many groups a person joins, not by the size of the database.
 * That is what separates it from the id lists this code used to build: `filterInvisiblePosts`
 * once collected every post id the viewer must not see, which for an anonymous visitor was
 * every post in every non-public group.
 *
 * Anonymous viewers hold no memberships, so they skip the query entirely.
 */
export const activeGroupIds = async (context: Context): Promise<string[]> => {
  if (!context.user) {
    return []
  }
  const result = await context.database.query({
    query: `
      MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group:Group)
      WHERE membership.role <> $pendingRole
      RETURN collect(group.id) AS groupIds
    `,
    variables: { userId: context.user.id, pendingRole: PENDING_GROUP_ROLE },
  })
  // No `?.` and no `?? []`. An aggregation with no grouping key emits exactly ONE row whatever
  // the MATCH found, and `collect()` yields an empty list rather than null — so a viewer with
  // no memberships lands here with `[]` in hand, not with a missing record. Guarding against
  // either was an unreachable arm; coverage is what surfaced that, and the guarantee is the
  // reason it stays gone rather than being silenced.
  return result.records[0].get('groupIds') as string[]
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
  groupIds: string[]
  /**
   * The group TYPES whose content this viewer may read without being a member.
   *
   * Always contains `public` — that content is open. A network moderator additionally holds
   * `group.content.read.any_closed` (and an admin `_hidden`), which is how #9405 gets fixed:
   * the filter's hard-coded `'public'` becomes a list the viewer brings with them, so the
   * moderator sees what they are asked to moderate without a per-row lookup and without
   * `groupType` stopping being the axis.
   */
  readableGroupTypes: string[]
}

// `public` plus whatever the viewer's network rights open up. Order is irrelevant; the list is
// bounded by the number of group types, not by anything the database holds.
export const readableGroupTypes = (context: Context): string[] => [
  'public',
  ...['closed', 'hidden'].filter((groupType) =>
    context.effectivePermissions.has(
      `group.content.read.any_${groupType}` as Parameters<
        Context['effectivePermissions']['has']
      >[0],
    ),
  ),
]

export const viewerScope = async (context: Context): Promise<ViewerScope> => ({
  viewerId: context.user?.id ?? null,
  groupIds: await activeGroupIds(context),
  readableGroupTypes: readableGroupTypes(context),
})
