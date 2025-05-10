/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { categories } from '@constants/categories'
import databaseContext from '@context/database'

const { query, write, driver } = databaseContext()

const createCategories = async () => {
  const result = await query({
    query: 'MATCH (category:Category) RETURN category { .* }',
  })

  const categoryIds = categories.map((c) => c.id)
  const categorySlugs = categories.map((c) => c.slug)
  await write({
    query: `MATCH (category:Category)
            WHERE NOT category.id IN $categoryIds
              OR NOT category.slug IN $categorySlugs
            DETACH DELETE category`,
    variables: {
      categoryIds,
      categorySlugs,
    },
  })

  const existingCategories = result.records.map((r) => r.get('category'))

  const newCategories = categories.filter((c) => !existingCategories.some((cat) => c.id === cat.id))

  await write({
    query: `UNWIND $newCategories AS map
            CREATE (category:Category)
            SET category = map
            SET category.createdAt = toString(datetime())`,
    variables: {
      newCategories,
    },
  })

  // eslint-disable-next-line no-console
  console.log('Successfully created categories!')
  await driver.close()
}

;(async function () {
  await createCategories()
})()
