import type { Context } from '@src/context'

type Resolver = (
  root: unknown,
  args: unknown,
  context: Context,
  resolveInfo: unknown,
) => Promise<unknown>
const checkCategoriesActive = (
  resolve: Resolver,
  root: unknown,
  args: unknown,
  context: Context,
  resolveInfo: unknown,
) => {
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
