/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getDriver, getNeode } from '@db/neo4j'

class Store {
  async init(errFn) {
    const neode = getNeode()
    const session = neode.session()
    const txFreshIndicesConstrains = session.writeTransaction(async (txc) => {
      // drop all indices and constraints
      await txc.run('CALL apoc.schema.assert({},{},true)')
      /* 
      #############################################
      # ADD YOUR CUSTOM INDICES & CONSTRAINS HERE #
      #############################################
      */
      // Search indexes (also part of migration 20230320130345-fulltext-search-indexes)
      await txc.run(
        `CALL db.index.fulltext.createNodeIndex("user_fulltext_search",["User"],["name", "slug"])`,
      )
      await txc.run(
        `CALL db.index.fulltext.createNodeIndex("post_fulltext_search",["Post"],["title", "content"])`,
      )
      await txc.run(`CALL db.index.fulltext.createNodeIndex("tag_fulltext_search",["Tag"],["id"])`) // also part of migration 20200207080200-fulltext_index_for_tags
      // Search indexes (also part of migration 20220803060819-create_fulltext_indices_and_unique_keys_for_groups)
      await txc.run(`
        CALL db.index.fulltext.createNodeIndex("group_fulltext_search",["Group"],["name", "slug", "about", "description"])
      `)
    })
    try {
      // Due to limitations of neode in combination with the limitations of the community version of neo4j
      // we need to have all constraints and indexes defined here. They can not be properly migrated
      await txFreshIndicesConstrains

      // You have to wait for the schema to install, else the constraints will not be present.
      // This is a type error of the library

      getNeode().schema.install()
      // eslint-disable-next-line no-console
      console.log('Successfully created database indices and constraints!')
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      errFn(error)
    } finally {
      await session.close()
      neode.close()
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
      // eslint-disable-next-line no-catch-all/no-catch-all
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
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      next(error)
    } finally {
      await session.close()
    }
  }
}

export default Store
