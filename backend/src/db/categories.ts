/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { categories } from '@constants/categories'

import { getDriver } from './neo4j'

interface Category {
  icon: string
  id: string
  slug: string
  name: string
}

const createCategories = async () => {
  const driver = getDriver()
  const session = driver.session()
  let existingCategories: Category[] = []
  const existingCategoriesTxResultPromise = session.readTransaction(async (txc) => {
    const transactionResponse = await txc.run(`
      MATCH (category:Category)
      RETURN category { .* }
    `)
    return transactionResponse.records.map((record) => record.get('category'))
  })
  try {
    const result = await existingCategoriesTxResultPromise
    existingCategories = existingCategories.concat(result)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.log(`Error creating categories: ${error}`) // eslint-disable-line no-console
  }
  const existingCategoryIds = existingCategories.map((c) => c.id)
  const createCategoriesTxResultPromise = session.writeTransaction(async (txc) => {
    categories
      .filter((c) => !existingCategoryIds.includes(c.id))
      .forEach(({ icon, name, slug, id }) => {
        txc.run(
          `CREATE (c:Category {
          icon: "${icon}",
          slug: "${slug}",
          name: "${name}",
          id: "${id}",
          createdAt: toString(datetime())
        })`,
        )
      })
  })
  try {
    await createCategoriesTxResultPromise
    console.log('Successfully created categories!') // eslint-disable-line no-console
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.log(`Error creating categories: ${error}`) // eslint-disable-line no-console
  } finally {
    session.close()
    driver.close()
  }
}

;(async function () {
  await createCategories()
})()
