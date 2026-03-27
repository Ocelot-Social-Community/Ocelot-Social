/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description = 'Remove contentExcerpt property from Post and Comment nodes'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    await transaction.run(`
      MATCH (n)
      WHERE n:Post OR n:Comment
      REMOVE n.contentExcerpt
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

export function down(_next) {
  throw new Error(
    'Irreversible migration: contentExcerpt was removed and cannot be restored without regenerating from content',
  )
}
