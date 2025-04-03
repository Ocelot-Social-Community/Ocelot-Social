import { getDriver, getNeode } from '../../db/neo4j'

class Store {
  async init(errFn) {
    const neode = getNeode()
    const session = neode.driver.session()
    const writeTxResultPromise = session.writeTransaction(async (txc) => {
      await txc.run('CALL apoc.schema.assert({},{},true)') // drop all indices and constraints
    })
    try {
      // TODO: this breaks custom constraints, but neode.schema.drop() does not work
      await writeTxResultPromise
      await getNeode().schema.install()
      // eslint-disable-next-line no-console
      console.log('Successfully installed neode schema!')
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      errFn(error)
    } finally {
      session.close()
      neode.driver.close()
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
      session.close()
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
      session.close()
    }
  }
}

module.exports = Store
