import type { Context } from '@src/context'

/**
 * The membership roles that grant access to a group's content.
 *
 * `pending` is deliberately absent: an applicant is a member row, not a member. The literal is
 * repeated in a dozen hand-written Cypher strings across the resolvers; this copy is the one
 * the post visibility rule uses, so that rule and the lookup feeding it cannot drift apart.
 */
export const ACTIVE_GROUP_ROLES = ['usual', 'admin', 'owner']

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
      WHERE membership.role IN $roles
      RETURN collect(group.id) AS groupIds
    `,
    variables: { userId: context.user.id, roles: ACTIVE_GROUP_ROLES },
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
}

export const viewerScope = async (context: Context): Promise<ViewerScope> => ({
  viewerId: context.user?.id ?? null,
  groupIds: await activeGroupIds(context),
})
