import cypherFields from './helpers/cypherField'
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
  defaultOrder: 'category.name ASC',
})

// The Category query and its field resolvers. Both used to come from neo4j-graphql-js —
// the query from schema augmentation, `posts` and `postCount` from @relation/@cypher
// directives — and are hand-written since the migration.
//
// `posts` is deliberately unfiltered, matching the directive it replaced: it returns every
// post of the category. Visibility filtering belongs to the queries that surface posts;
// adding it here would have been a behaviour change smuggled into a mechanical migration.
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
        posts: '<-[:CATEGORIZED]-(related:Post)',
      },
    }),
    ...cypherFields('Category', {
      postCount: 'MATCH (this)<-[:CATEGORIZED]-(r:Post) RETURN COUNT(r)',
    }),
  },
}
