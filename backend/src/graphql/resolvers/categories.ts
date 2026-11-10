import cypherFields from './helpers/cypherField'
import { postReadableBy } from './helpers/groupAccessCypher'
import { nodeQuery } from './helpers/nodeQuery'
import Resolver from './helpers/Resolver'

import type { NodeQueryParams } from './helpers/nodeQuery'
import type { Context } from '@src/context'

const categoryQuery = nodeQuery({
  label: 'Category',
  equalityFields: ['id', 'name', 'slug', 'icon', 'createdAt', 'updatedAt'],
  orderingEnum: '_CategoryOrdering',
  // postCount is a @cypher field, not a stored property — sorting by `category.postCount`
  // would compare nulls and quietly do nothing.
  computedOrder: { postCount: 'size([(category)<-[:CATEGORIZED]-(p:Post) | p])' },
  defaultOrder: { field: 'name', direction: 'ASC' as const },
})

// The Category query and its field resolvers. Both used to come from neo4j-graphql-js —
// the query from schema augmentation, `posts` and `postCount` from @relation/@cypher
// directives — and are hand-written since the migration.
//
// `posts` was left unfiltered by the migration, matching the directive it replaced — and so
// served the posts of closed and hidden groups to anyone who asked a category. It now keeps
// to the post visibility rule; `postCount` stays a plain count, a number names no post.
export default {
  Query: {
    // Category advertises no filter beyond its scalar arguments, so equality + ordering +
    // paging is the whole contract — hence the shared nodeQuery helper.
    Category: async (_object, params: NodeQueryParams, context: Context, _resolveInfo) =>
      categoryQuery(params, context),
  },
  Category: {
    ...Resolver('Category', {
      hasMany: {
        // Only what the viewer reads: a category gathers posts from every group.
        posts: `<-[:CATEGORIZED]-(related:Post) WHERE ${postReadableBy('related', '$cypherParams.currentUserId')}`,
      },
    }),
    ...cypherFields('Category', {
      postCount: 'MATCH (this)<-[:CATEGORIZED]-(r:Post) RETURN COUNT(r)',
    }),
  },
}
