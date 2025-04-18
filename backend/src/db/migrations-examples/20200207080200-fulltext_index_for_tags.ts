/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable security/detect-non-literal-fs-filename */
import { getDriver } from '@db/neo4j'

export const description =
  'This migration adds a fulltext index for the tags in order to search for Hasthags.'

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // We do do this in /src/db/migrate/store.ts
    /*
    await transaction.run(`
      CALL db.index.fulltext.createNodeIndex("tag_fulltext_search",["Tag"],["id"])
    `)
    await transaction.commit()
    */
    next()
  } catch (error) {
    const { message } = error
    if (message.includes('There already exists an index')) {
      // all fine
      // eslint-disable-next-line no-console
      console.log(message)
      next()
    } else {
      await transaction.rollback()
      // eslint-disable-next-line no-console
      console.log('rolled back')
      throw new Error(error)
    }
  } finally {
    await session.close()
  }
}

export async function down(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    // We do do this in /src/db/migrate/store.ts
    /*
    await transaction.run(`
      CALL db.index.fulltext.drop("tag_fulltext_search")
    `)
    await transaction.commit()
    */
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    await session.close()
  }
}
