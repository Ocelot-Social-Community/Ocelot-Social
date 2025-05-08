/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { categories } from '@constants/categories'
import databaseContext from '@context/database'

const { query, mutate, driver } = databaseContext()

const createCategories = async () => {
  const result = await query({
    query: 'MATCH (category:Category) RETURN category { .* }',
  })

  const existingCategories = result.records.map((r) => r.get('category'))
  const existingCategoryIds = existingCategories.map((c) => c.id)

  const newCategories = categories.filter((c) => !existingCategoryIds.includes(c.id))

  await mutate({
    query: `UNWIND $newCategories AS map
            CREATE (category:Category)
            SET category = map
            SET category.createdAt = toString(datetime())`,
    variables: {
      newCategories,
    },
  })

  const categoryIds = categories.map((c) => c.id)
  await mutate({
    query: `MATCH (category:Category)
            WHERE NOT category.id IN $categoryIds
            DETACH DELETE category`,
    variables: {
      categoryIds,
    },
  })
  // eslint-disable-next-line no-console
  console.log('Successfully created categories!')
  await driver.close()
}

;(async function () {
  await createCategories()
})()
