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

// The ids among `categoryIds` that name no category. Checked before anything is written: an
// unknown id matches nothing, which ends the write query's rows there — a post's group was
// then never attached, and a group or post was saved without the categories it was sent.
export const unknownCategoryIds = async (
  context: Context,
  categoryIds: string[],
): Promise<string[]> => {
  const session = context.driver.session()
  try {
    return await session.readTransaction(async (txc) => {
      const result = await txc.run(
        `UNWIND $categoryIds AS categoryId
         OPTIONAL MATCH (category:Category {id: categoryId})
         WITH categoryId, category WHERE category IS NULL
         RETURN collect(DISTINCT categoryId) AS unknown`,
        { categoryIds },
      )
      // collect() always yields one row, an empty list when nothing is unknown.
      return result.records[0].get('unknown') as string[]
    })
  } finally {
    await session.close()
  }
}
