/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { v4 as uuid } from 'uuid'

import { getDriver } from '@db/neo4j'

export const description =
  'This migration adds a Donations node with default settings to the database.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    const donationId = uuid()
    await transaction.run(
      `
        MERGE (donationInfo:Donations)
        SET donationInfo.id = $donationId
        SET donationInfo.createdAt = toString(datetime())
        SET donationInfo.updatedAt = donationInfo.createdAt
        SET donationInfo.showDonations = false
        SET donationInfo.goal = 15000.0
        SET donationInfo.progress = 1200.0
        RETURN donationInfo {.*}
      `,
      { donationId },
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
    // Implement your migration here.
    await transaction.run(`
        MATCH (donationInfo:Donations)
        DETACH DELETE donationInfo
        RETURN donationInfo
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
