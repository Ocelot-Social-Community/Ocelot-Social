import { getDriver, getNeode } from '../../db/neo4j'
import { hashSync } from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { categories } from '../../constants/categories'
import CONFIG from '../../config'

const defaultAdmin = {
  email: 'admin@example.org',
  password: hashSync('1234', 10),
  name: 'admin',
  id: uuid(),
  slug: 'admin',
}

const createCategories = async (session) => {
  const createCategoriesTxResultPromise = session.writeTransaction(async (txc) => {
    categories.forEach(({ icon, name }, index) => {
      const id = `cat${index + 1}`
      txc.run(
        `MERGE (c:Category {
          icon: "${icon}",
          slug: "${name}",
          name: "${name}",
          id: "${id}",
          createdAt: toString(datetime())
        })`,
      )
    })
  })
  try {
    await createCategoriesTxResultPromise
    console.log('Successfully created categories!') // eslint-disable-line no-console
  } catch (error) {
    console.log(`Error creating categories: ${error}`) // eslint-disable-line no-console
  }
}

const createDefaultAdminUser = async (session) => {
  const readTxResultPromise = session.readTransaction(async (txc) => {
    const result = await txc.run('MATCH (user:User) RETURN count(user) AS userCount')
    return result.records.map((r) => r.get('userCount'))
  })
  let createAdmin = false
  try {
    const userCount = parseInt(String(await readTxResultPromise))
    if (userCount === 0) createAdmin = true
  } catch (error) {
    console.log(error) // eslint-disable-line no-console
  }
  if (createAdmin) {
    const createAdminTxResultPromise = session.writeTransaction(async (txc) => {
      await txc.run(
        `MERGE (e:EmailAddress {
           email: "${defaultAdmin.email}",
           createdAt: toString(datetime())
         })-[:BELONGS_TO]->(u:User {
           name: "${defaultAdmin.name}",
           encryptedPassword: "${defaultAdmin.password}",
           role: "admin",
           id: "${defaultAdmin.id}",
           slug: "${defaultAdmin.slug}",
           createdAt: toString(datetime()),
           allowEmbedIframes: false,
           showShoutsPublicly: false,
           sendNotificationEmails: true,
           deleted: false,
           disabled: false
         })-[:PRIMARY_EMAIL]->(e)`,
      )
    })
    try {
      await createAdminTxResultPromise
      console.log('Successfully created default admin user!') // eslint-disable-line no-console
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
    }
  }
}

class Store {
  async init(next) {
    const neode = getNeode()
    const { driver } = neode
    const session = driver.session()
    await createDefaultAdminUser(session)
    if (CONFIG.CATEGORIES_ACTIVE) await createCategories(session)
    const writeTxResultPromise = session.writeTransaction(async (txc) => {
      await txc.run('CALL apoc.schema.assert({},{},true)') // drop all indices and constraints
      return Promise.all(
        [
          'CALL db.index.fulltext.createNodeIndex("user_fulltext_search",["User"],["name", "slug"])',
          'CALL db.index.fulltext.createNodeIndex("post_fulltext_search",["Post"],["title", "content"])',
          'CALL db.index.fulltext.createNodeIndex("tag_fulltext_search",["Tag"],["id"])',
        ].map((statement) => txc.run(statement)),
      )
    })
    try {
      await writeTxResultPromise
      await getNeode().schema.install()
      // eslint-disable-next-line no-console
      console.log('Successfully created database indices and constraints!')
      next()
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      next(error, null)
    } finally {
      await session.close()
      await driver.close()
    }
  }

  async load(next) {
    const driver = getDriver()
    const session = driver.session()
    const readTxResultPromise = session.readTransaction(async (txc) => {
      const result = await txc.run(
        'MATCH (migration:Migration) RETURN migration {.*} ORDER BY migration.timestamp DESC',
      )
      return result.records.map((r) => r.get('migration'))
    })
    try {
      const migrations = await readTxResultPromise
      if (migrations.length <= 0) {
        // eslint-disable-next-line no-console
        console.log(
          "No migrations found in database. If it's the first time you run migrations, then this is normal.",
        )
        return next(null, {})
      }
      const [{ title: lastRun }] = migrations
      next(null, { lastRun, migrations })
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      next(error)
    } finally {
      await session.close()
    }
  }

  async save(set, next) {
    const driver = getDriver()
    const session = driver.session()
    const { migrations } = set
    const writeTxResultPromise = session.writeTransaction((txc) => {
      return Promise.all(
        migrations.map(async (migration) => {
          const { title, description, timestamp } = migration
          const properties = { title, description, timestamp }
          const migrationResult = await txc.run(
            `
              MERGE (migration:Migration { title: $properties.title })
              ON MATCH SET
              migration += $properties
              ON CREATE SET
              migration += $properties,
              migration.migratedAt = toString(datetime())
            `,
            { properties },
          )
          return migrationResult
        }),
      )
    })
    try {
      await writeTxResultPromise
      next()
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      next(error)
    } finally {
      await session.close()
    }
  }
}

module.exports = Store
