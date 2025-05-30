/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description = ''

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // We do do this in /src/db/migrate/store.ts
    /*
    // Drop indexes if they exist because due to legacy code they might be set already
    const indexesResponse = await transaction.run(`CALL db.indexes()`)
    const indexes = indexesResponse.records.map((record) => record.get('name'))
    if (indexes.indexOf('user_fulltext_search') > -1) {
      await transaction.run(`CALL db.index.fulltext.drop("user_fulltext_search")`)
    }
    if (indexes.indexOf('post_fulltext_search') > -1) {
      await transaction.run(`CALL db.index.fulltext.drop("post_fulltext_search")`)
    }
    if (indexes.indexOf('tag_fulltext_search') > -1) {
      await transaction.run(`CALL db.index.fulltext.drop("tag_fulltext_search")`)
    }
    // Create indexes
    await transaction.run(
      `CALL db.index.fulltext.createNodeIndex("user_fulltext_search",["User"],["name", "slug"])`,
    )
    await transaction.run(
      `CALL db.index.fulltext.createNodeIndex("post_fulltext_search",["Post"],["title", "content"])`,
    )
    await transaction.run(
      `CALL db.index.fulltext.createNodeIndex("tag_fulltext_search",["Tag"],["id"])`,
    )
    await transaction.commit()
    */
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

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // We do do this in /src/db/migrate/store.ts
    /*
    await transaction.run(`CALL db.index.fulltext.drop("user_fulltext_search")`)
    await transaction.run(`CALL db.index.fulltext.drop("post_fulltext_search")`)
    await transaction.run(`CALL db.index.fulltext.drop("tag_fulltext_search")`)
    await transaction.commit()
    */
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
