/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable security/detect-non-literal-fs-filename */
import { getDriver } from '@db/neo4j'

export const description = `
  This migration creates a MUTED relationship between two edges(:User) that have a pre-existing BLOCKED relationship.
  It also sets the createdAt date for the BLOCKED relationship to the datetime the migration was run. This became 
  necessary after we redefined what it means to block someone, and what it means to mute them. Muting is about filtering
  another user's content, whereas blocking means preventing that user from interacting with you/your contributions.
  A blocked user will still be able to see your contributions, but will not be able to interact with them and vice versa.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    await transaction.run(
      `
        MATCH (blocker:User)-[blocked:BLOCKED]->(blockee:User)
        MERGE (blocker)-[muted:MUTED]->(blockee)
        SET muted.createdAt = toString(datetime()), blocked.createdAt = toString(datetime())
      `,
    )
    await transaction.commit()
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
  } finally {
    await session.close()
  }
}

export function down(next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Rollback your migration here.
    next()
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    next(err)
  } finally {
    await session.close()
  }
}
