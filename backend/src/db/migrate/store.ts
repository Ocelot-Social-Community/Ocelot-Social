/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import CONFIG from '@config/index'
import { closeDriver, getDriver } from '@db/neo4j'
import { applyPlan, enforce, planConstraints } from '@db/schema/derive/apply'
import { declaredIndexStatements, isKnownProfile } from '@db/schema/derive/drift'
import { runnerFor } from '@db/schema/derive/runner'
import { entities, relationships } from '@db/schema/index'

import type { Enforcement } from '@db/schema/derive/apply'
import type { BackendProfile } from '@db/schema/derive/ddl'

// The backend profile decides which of the declared rules the database can actually enforce.
// Explicit rather than sniffed from `dbms.components()`: the operator knows what they run, and
// a wrong guess would silently emit statements the server rejects.
const profile = (): BackendProfile => {
  const configured = CONFIG.NEO4J_PROFILE
  if (!isKnownProfile(configured)) {
    throw new Error(`NEO4J_PROFILE is not a known backend profile: ${configured}`)
  }
  return configured
}

// Production reports and carries on; everywhere else a violation is an error.
//
// A constraint that cannot be created leaves the database exactly as it already is, so
// skipping it is never a regression — whereas an aborted init container is an outage. In CI
// and locally the data is disposable and a violation means the code or the declaration is
// wrong, which is precisely what should stop the run.
const enforcement = (): Enforcement => (CONFIG.PRODUCTION ? 'report' : 'strict')

class Store {
  /**
   * Brings constraints and indices in line with `src/db/schema`.
   *
   * Replaces two things that used to live here:
   *
   *   - `CALL apoc.schema.assert({},{},true)`, which DROPPED every constraint and index before
   *     reinstalling them. The helm chart runs this init container on every pod start
   *     (deployment.yaml: `yarn prod:migrate init && yarn prod:migrate up`), so production spent
   *     a window of every single deployment with no constraint enforcement at all.
   *   - `neode.schema.install()`, which derived the DDL from `src/db/models`. It emitted
   *     uniqueness constraints twice for Post (once per label, via `extend('Post','Article')`)
   *     and no index at all for `Role.name`/`Setting.namespace`, because neode reads that flag
   *     from `index` while the models spell it `indexed`.
   *
   * The declaration converges instead: `CREATE ... IF NOT EXISTS` recognises an equivalent
   * object whatever it is named, so running this on every deployment is a no-op once the
   * database matches. Each constraint is audited BEFORE it is created, so violating data turns
   * into a report rather than a failed statement — see db/schema/derive/apply.ts for why that
   * matters on Neo4j 4.4.
   *
   * Not removed automatically: an object the database holds and the declaration no longer
   * wants. `run-audit.ts check` reports it as SURPLUS; dropping stays a deliberate migration.
   */
  async init(errFn) {
    const session = getDriver().session()
    try {
      const target = profile()
      const { statements, unsupported } = declaredIndexStatements(entities, target)
      const report = await applyPlan(
        runnerFor(session),
        planConstraints(entities, relationships, target),
        statements,
        unsupported,
      )

      /* eslint-disable no-console */
      console.log(
        `Schema (${target}): ${String(report.applied.length)} applied, ` +
          `${String(report.unchanged.length)} already in place`,
      )
      for (const item of report.skipped) {
        console.log(
          `SKIPPED ${item.violation}: ${String(item.violations)} violation(s) — ` + item.statement,
        )
        for (const row of item.sample) {
          console.log(`  ${JSON.stringify(row)}`)
        }
      }
      for (const item of report.failed) {
        console.log(`FAILED ${item.code}: ${item.message} — ${item.statement}`)
      }
      for (const item of report.unsupported) {
        console.log(`UNSUPPORTED ${item}`)
      }
      /* eslint-enable no-console */

      enforce(report, enforcement())
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      console.log(error) // eslint-disable-line no-console
      errFn(error)
    } finally {
      await session.close()
      // The old implementation closed neode here, which closed its driver with it. Without an
      // equivalent the shared driver keeps its sockets open and the `migrate init` process
      // never exits — the CLI has nothing else to wait for. getDriver() re-creates on demand,
      // so closing is safe even if something in the same process needs it afterwards.
      await closeDriver()
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
    const writeTxResultPromise = session.writeTransaction(async (txc) => {
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
