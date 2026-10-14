import type { PostQueryParams } from './postFilter'
import type { ViewerScope } from './viewerGroups'

// Marks the query so postFilterToCypher can express visibility as a graph condition.
//
// Two rewrites deep now. It first ran its own query and collected the ids of every post the
// viewer must not see, passing them in as `id_not_in` — for an anonymous visitor that was every
// post in a non-public group, an unbounded list travelling with each request, because
// neo4j-graphql-js could not filter across a relation. It then asked the graph for a
// CANNOT_SEE edge instead. The edge is gone; the rule is now read off the group itself.
//
// Kept as a wrapper rather than inlined into the resolvers so the two post queries cannot
// drift apart on something this close to access control.

/**
 * The part of the viewer's elevations this request may use: only what it names.
 *
 * An elevation is asked for to look inside ONE group — its page, or one of its posts reached
 * from a report. It is not a subscription: a feed, a search or a profile list carries no
 * network content even while the elevation lasts (#10506). The same rule `Query.Group` applies
 * to the group itself (`namesOneGroup` in resolvers/groups.ts).
 *
 *   one group   `filter.group.id` — the group page's post list; an `id_in` is a list, not a name
 *   one post    `id` / `slug`, as an argument or in the filter — the post page; the post's own
 *               group still has to be among the elevated ones, `invisibleTo` checks that
 */
const elevatedGroupsNamedBy = (params: PostQueryParams, viewer: ViewerScope): string[] => {
  const filter = params.filter ?? {}
  const group = filter.group as { id?: string } | undefined
  if (group?.id !== undefined) {
    return viewer.elevatedGroupIds.filter((id) => id === group.id)
  }
  const namesOnePost = [params.id, params.slug, filter.id, filter.slug].some(
    (value) => value !== undefined && value !== null,
  )
  return namesOnePost ? viewer.elevatedGroupIds : []
}

export const filterInvisiblePosts = (
  params: PostQueryParams,
  viewer: ViewerScope,
): PostQueryParams => ({
  ...params,
  filter: {
    ...params.filter,
    invisibleTo: { ...viewer, elevatedGroupIds: elevatedGroupsNamedBy(params, viewer) },
  },
})
