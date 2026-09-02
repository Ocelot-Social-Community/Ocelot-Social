import type { Context } from '@src/context/index'
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
  if (context.policy.get('categoriesActive')) {
    return resolve(root, args, context, resolveInfo)
  }
  return []
}

export default {
  Query: {
    Category: checkCategoriesActive,
  },
}
