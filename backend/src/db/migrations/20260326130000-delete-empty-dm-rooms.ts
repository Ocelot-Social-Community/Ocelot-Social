/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'

export const description =
  'Delete empty DM rooms (no messages) that were created by the old CreateRoom mutation'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    await transaction.run(`
      MATCH (room:Room)
      WHERE NOT (room)-[:ROOM_FOR]->(:Group)
        AND NOT (room)<-[:INSIDE]-(:Message)
      DETACH DELETE room
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
  // Cannot restore deleted rooms
}
