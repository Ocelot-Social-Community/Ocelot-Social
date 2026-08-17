import Resolver from './helpers/Resolver'

// Like categories.ts: no root resolver, only the field resolver, so Tag.taggedPosts stops
// depending on a neo4jgraphql() translation being in flight. See the migration plan, B2.
//
// Unfiltered on purpose — it mirrors the @relation directive it replaces. Tag.taggedCount
// and taggedCountUnique are still @cypher and follow in B3.
export default {
  Tag: {
    ...Resolver('Tag', {
      hasMany: {
        taggedPosts: '<-[:TAGGED]-(related:Post)',
      },
    }),
  },
}
