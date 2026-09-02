import cypherFields from './helpers/cypherField'
import { nodeQuery } from './helpers/nodeQuery'
import Resolver from './helpers/Resolver'

import type { NodeQueryParams } from './helpers/nodeQuery'
import type { Context } from '@src/context'

const tagQuery = nodeQuery({
  label: 'Tag',
  equalityFields: ['id'],
  // Tag.gql exposes deleted/disabled as plain fields; keep them matchable like the
  // generated query did.
  softDeleteFields: ['deleted', 'disabled'],
  orderingEnum: '_TagOrdering',
  // Both counts are @cypher fields, not stored properties, so they need an expression —
  // `tag.taggedCount` would compare nulls and quietly do nothing. The unique variant needs
  // DISTINCT, which a pattern comprehension cannot express; apoc.coll.toSet is available
  // (see NEO4J_dbms_security_procedures_unrestricted in docker-compose.yml) and verified.
  computedOrder: {
    taggedCount: 'size([(tag)<-[:TAGGED]-(p:Post) | p])',
    taggedCountUnique:
      'size(apoc.coll.toSet([(tag)<-[:TAGGED]-(:Post)<-[:WROTE]-(u:User) | u.id]))',
  },
  defaultOrder: { field: 'id', direction: 'ASC' as const },
})

// The Tag query and its field resolvers, hand-written since the neo4j-graphql-js migration.
//
// `taggedPosts` is unfiltered on purpose — it mirrors the @relation directive it replaced.
export default {
  Query: {
    Tag: async (_object, params: NodeQueryParams, context: Context, _resolveInfo) =>
      tagQuery(params, context),
  },
  Tag: {
    ...Resolver('Tag', {
      hasMany: {
        taggedPosts: '<-[:TAGGED]-(related:Post)',
      },
    }),
    ...cypherFields('Tag', {
      taggedCount: 'MATCH (this)<-[:TAGGED]-(p) RETURN COUNT(DISTINCT p)',
      taggedCountUnique: 'MATCH (this)<-[:TAGGED]-(p)<-[:WROTE]-(u:User) RETURN COUNT(DISTINCT u)',
    }),
  },
}
