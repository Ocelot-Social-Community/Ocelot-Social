import { getDriver } from '../../db/neo4j'

export const description = `
This migration adds the clickedCount property to all posts, setting it to 0.
`

module.exports.up = async function (next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Implement your migration here.
    await transaction.run(`
        MATCH (p:Post)
        SET p.clickedCount = 0
    `)
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}

module.exports.down = async function (next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Implement your migration here.
    await transaction.run(`
        MATCH (p:Post)
        REMOVE p.clickedCount
    `)
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}
