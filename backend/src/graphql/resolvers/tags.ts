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
  defaultOrder: 'tag.id ASC',
  filterFields: ['id_in'],
})

// Like categories.ts: no root resolver, only field resolvers, so Tag's fields stop
// depending on a neo4jgraphql() translation being in flight. See the migration plan, B2/B3.
//
// Unfiltered on purpose — mirrors the directives they replace.
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
