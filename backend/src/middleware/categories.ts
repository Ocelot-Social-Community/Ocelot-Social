import type { Context } from '@src/context'
import type { GraphQLResolveInfo } from 'graphql'

type Resolver = (
  root: unknown,
  args: unknown,
  context: Context,
  resolveInfo: GraphQLResolveInfo,
) => Promise<unknown>
const checkCategoriesActive = async (
  resolve: Resolver,
  root: unknown,
  args: unknown,
  context: Context,
  resolveInfo: GraphQLResolveInfo,
): Promise<unknown> => {
  if (context.config.CATEGORIES_ACTIVE) {
    return resolve(root, args, context, resolveInfo)
  }
  return []
}

export default {
  Query: {
    Category: checkCategoriesActive,
  },
}
