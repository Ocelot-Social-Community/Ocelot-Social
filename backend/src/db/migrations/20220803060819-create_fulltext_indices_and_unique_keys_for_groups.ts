/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getDriver } from '@db/neo4j'

export const description = `
  We introduced a new node label 'Group' and we need two primary keys 'id' and 'slug' for it.
  Additional we like to have fulltext indices the keys 'name', 'slug', 'about', and 'description'.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Those two indexes already exist
    // await transaction.run(`
    //   CREATE CONSTRAINT ON ( group:Group ) ASSERT group.id IS UNIQUE
    // `)
    // await transaction.run(`
    //   CREATE CONSTRAINT ON ( group:Group ) ASSERT group.slug IS UNIQUE
    // `)

    // We do do this in /src/db/migrate/store.ts
    /*
    await transaction.run(`
      CALL db.index.fulltext.createNodeIndex("group_fulltext_search",["Group"],["name", "slug", "about", "description"])
    `)
    */
    await transaction.commit()
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

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    // We do do this in /src/db/migrate/store.ts
    /*
    await transaction.run(`
      DROP CONSTRAINT ON ( group:Group ) ASSERT group.id IS UNIQUE
    `)
    await transaction.run(`
      DROP CONSTRAINT ON ( group:Group ) ASSERT group.slug IS UNIQUE
    `)
    await transaction.run(`
      CALL db.index.fulltext.drop("group_fulltext_search")
    `)
    await transaction.commit()
    */
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
