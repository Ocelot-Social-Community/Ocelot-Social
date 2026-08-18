import type { PostQueryParams } from './postFilter'
import type { Context } from '@src/context'

// Marks the query so postFilterToCypher can exclude muted authors as a graph condition.
//
// This used to call getMutedUsers() first — a full query per post request that loaded the
// COMPLETE user objects of everyone the viewer muted, just to map them down to ids and pass
// them in as `author_not.id_in`. neo4j-graphql-js could not filter across a relation, so the
// ids were the only route; the hand-written query asks the graph (see the `mutedBy` operator).
//
// Single-post lookups by id or slug keep skipping the filter: navigating directly to a post
// should show it even if its author is muted.
export const filterForMutedUsers = (params: PostQueryParams, context: Context): PostQueryParams => {
  if (!context.user || params.id || params.slug) return params
  return { ...params, filter: { ...params.filter, mutedBy: context.user.id } }
}
