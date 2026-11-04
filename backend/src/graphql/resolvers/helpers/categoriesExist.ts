import type { Context } from '@src/context'

// Whether any Category nodes exist. Keeps saving groups and posts graceful: the "categories
// required" rule only applies when the policy is on AND there is at least one category to
// choose from (mirrors the frontend gating in getCategoriesMixin).
export const categoriesExist = async (context: Context): Promise<boolean> => {
  const session = context.driver.session()
  try {
    return await session.readTransaction(async (txc) => {
      const result = await txc.run(
        'MATCH (category:Category) RETURN count(category) > 0 AS hasCategories',
      )
      return Boolean(result.records[0]?.get('hasCategories'))
    })
  } finally {
    await session.close()
  }
}
