import { getDriver } from '../neo4j'

export const description = `
  We change the full-text index on node label 'Group' from property 'description' to 'groupDescription'.
  This belongs to next migration '20221109201106-change_group_properties_from_description_to_groupDescription'.
`

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      CALL db.index.fulltext.drop('group_fulltext_search')
    `)
    await transaction.run(`
      CALL db.index.fulltext.createNodeIndex("group_fulltext_search",["Group"],["name", "slug", "about", "groupDescription"])
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

export async function down(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      CALL db.index.fulltext.drop('group_fulltext_search')
    `)
    await transaction.run(`
      CALL db.index.fulltext.createNodeIndex("group_fulltext_search",["Group"],["name", "slug", "about", "description"])
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
