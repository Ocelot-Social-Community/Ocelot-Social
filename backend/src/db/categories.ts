import { categories } from '@constants/categories'

import { getDriver } from './neo4j'

const createCategories = async () => {
  const driver = getDriver()
  const session = driver.session()
  const createCategoriesTxResultPromise = session.writeTransaction(async (txc) => {
    categories.forEach(({ icon, name }, index) => {
      const id = `cat${index + 1}`
      txc.run(
        `MERGE (c:Category {
          icon: "${icon}",
          slug: "${name}",
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
