/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description = `
This migration adds the viewedTeaserCount property to all posts, setting it to 0.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Implement your migration here.
    await transaction.run(`
        MATCH (p:Post)
        SET p.viewedTeaserCount = 0
    `)
    await transaction.commit()
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
    // Implement your migration here.
    await transaction.run(`
        MATCH (p:Post)
        REMOVE p.viewedTeaserCount
    `)
    await transaction.commit()
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
