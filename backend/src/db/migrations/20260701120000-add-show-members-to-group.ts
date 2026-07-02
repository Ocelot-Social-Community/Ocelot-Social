import { getDriver } from '@db/neo4j'

export const description =
  'Add showMembers field to existing closed Group nodes, defaulting to false. Public and hidden groups ignore this field (always true / always false).'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    await transaction.run(
      `
        MATCH (group:Group)
        WHERE group.groupType = 'closed' AND group.showMembers IS NULL
        SET group.showMembers = false
      `,
    )
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
    await transaction.run(
      `
        MATCH (group:Group)
        REMOVE group.showMembers
      `,
    )
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
