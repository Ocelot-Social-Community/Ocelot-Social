import cypherFields from './helpers/cypherField'
import Resolver from './helpers/Resolver'

// Like categories.ts: no root resolver, only field resolvers, so Tag's fields stop
// depending on a neo4jgraphql() translation being in flight. See the migration plan, B2/B3.
//
// Unfiltered on purpose — mirrors the directives they replace.
export default {
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
