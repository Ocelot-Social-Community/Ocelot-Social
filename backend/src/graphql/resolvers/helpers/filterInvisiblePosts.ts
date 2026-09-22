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
export const filterInvisiblePosts = (
  params: PostQueryParams,
  viewer: ViewerScope,
): PostQueryParams => ({
  ...params,
  filter: { ...params.filter, invisibleTo: viewer },
})
