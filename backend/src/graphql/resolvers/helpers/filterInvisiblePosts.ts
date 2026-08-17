import type { Context } from '@src/context'

interface FilterParams {
  filter?: Record<string, unknown>
  [key: string]: unknown
}

// Marks the query so postFilterToCypher can express visibility as a graph condition.
//
// This used to run its own query first, collecting the ids of every post the viewer must
// not see and passing them in as `id_not_in`. For an anonymous visitor that is every post
// in a non-public group — a list that grows with the database and travels with each
// request. neo4j-graphql-js could not filter on a relation, so the ids were the only way
// through; hand-written Cypher asks the graph directly (see the `invisibleTo` operator).
//
// Kept as a wrapper rather than inlined into the resolvers so the two post queries cannot
// drift apart on something this close to access control.
export const filterInvisiblePosts = (params: FilterParams, context: Context): FilterParams => ({
  ...params,
  filter: { ...params.filter, invisibleTo: context.user?.id ?? null },
})
