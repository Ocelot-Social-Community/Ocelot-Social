/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description = `
All users commenting a post observe the post.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (commenter:User)-[:WROTE]->(:Comment)-[:COMMENTS]->(post:Post)
      MERGE (commenter)-[obs:OBSERVES]->(post)
      ON CREATE SET
        obs.active = true,
        obs.createdAt = toString(datetime()),
        obs.updatedAt = toString(datetime())
      RETURN post
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
      MATCH (u:User)-[obs:OBSERVES]->(p:Post)<-[:COMMENTS]-(:Comment)<-[:WROTE]-(u)
      WHERE NOT (u)-[:WROTE]->(post)
      DELETE obs
      RETURN p
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
