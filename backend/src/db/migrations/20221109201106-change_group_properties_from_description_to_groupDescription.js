import { getDriver } from '../neo4j'

export const description = `
  We change on node label 'Group':
  – properties name 'description' to 'groupDescription'
  – properties name 'descriptionExcerpt' to 'groupDescriptionExcerpt'
  This belongs to further migration '20221109171154-change_group_fulltext_index_for_property_description_to_groupDescription'.
`

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (group:Group)
      SET group.groupDescription = group.description
      REMOVE group.description
      SET group.groupDescriptionExcerpt = group.descriptionExcerpt
      REMOVE group.descriptionExcerpt
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
      MATCH (group:Group)
      SET group.description = group.groupDescription
      REMOVE group.groupDescription
      SET group.descriptionExcerpt = group.groupDescriptionExcerpt
      REMOVE group.groupDescriptionExcerpt
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
