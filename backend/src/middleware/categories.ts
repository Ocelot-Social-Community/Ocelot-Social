/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import CONFIG from '@src/config'

const checkCategoriesActive = (resolve, root, args, context, resolveInfo) => {
  if (CONFIG.CATEGORIES_ACTIVE) {
    return resolve(root, args, context, resolveInfo)
  }
  return []
}

export default {
  Query: {
    Category: checkCategoriesActive,
  },
}
