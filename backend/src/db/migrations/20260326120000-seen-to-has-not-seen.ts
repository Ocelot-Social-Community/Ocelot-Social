/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description =
  'Replace global message.seen flag with per-user HAS_NOT_SEEN relationships'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Create HAS_NOT_SEEN relationships for unseen messages
    // For each message with seen=false, create a relationship for each room member
    // who is not the sender
    await transaction.run(`
      MATCH (message:Message { seen: false })-[:INSIDE]->(room:Room)<-[:CHATS_IN]-(user:User)
      WHERE NOT (user)-[:CREATED]->(message)
      CREATE (user)-[:HAS_NOT_SEEN]->(message)
    `)

    // Remove the seen property from all messages
    await transaction.run(`
      MATCH (m:Message)
      REMOVE m.seen
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
    // Re-add seen property: messages with HAS_NOT_SEEN are unseen, rest are seen
    await transaction.run(`
      MATCH (m:Message)
      SET m.seen = true
    `)
    await transaction.run(`
      MATCH ()-[:HAS_NOT_SEEN]->(m:Message)
      SET m.seen = false
    `)

    // Remove all HAS_NOT_SEEN relationships
    await transaction.run(`
      MATCH ()-[r:HAS_NOT_SEEN]->(:Message)
      DELETE r
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
