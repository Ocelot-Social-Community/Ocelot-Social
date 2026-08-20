/* eslint-disable no-console */
import { closeDriver, getDriver } from '@db/neo4j'
import { auditsFor } from '@db/schema/derive/audit'
import { indexStatementsFor, statementFor } from '@db/schema/derive/ddl'
import { allRules } from '@db/schema/derive/rules'
import { entities, labels, relationships, relationshipTypes } from '@db/schema/index'

import type { BackendProfile } from '@db/schema/derive/ddl'

// Runs the declaration against a live database and reports, without changing anything:
//
//   1. every rule the backend cannot enforce, as a violation count
//   2. what the database has in the way of constraints/indices vs. what the declaration wants
//   3. which labels and relationship types exist that nothing declares
//
// Read-only by design. This is the P3 gate of the schema concept: it answers whether the
// invariants transcribed from the neode models actually hold in real data — before the
// remaining 20 entities are written against the same assumptions.
//
//   yarn tsx src/db/schema/run-audit.ts [profile]

const profile = (process.argv[2] ?? 'neo4j-community') as BackendProfile

const heading = (text: string): void => {
  console.log(`\n\x1b[1m${text}\x1b[0m`)
}

const main = async (): Promise<number> => {
  const driver = getDriver()
  const session = driver.session()
  let failures = 0

  try {
    heading(`1. Declared rules that ${profile} cannot enforce`)
    const audits = auditsFor(allRules(entities, relationships), profile)
    for (const { violation, cypher } of audits) {
      try {
        const result = await session.readTransaction((transaction) => transaction.run(cypher))
        const count = result.records[0]?.get('violations') as { toNumber?: () => number } | number
        const violations = typeof count === 'number' ? count : (count?.toNumber?.() ?? 0)
        if (violations > 0) {
          failures += 1
          console.log(`  \x1b[31mFAIL\x1b[0m  ${violation}: ${String(violations)}`)
        } else {
          console.log(`  ok    ${violation}`)
        }
        // eslint-disable-next-line no-catch-all/no-catch-all
      } catch (error) {
        failures += 1
        console.log(
          `  \x1b[33mERR \x1b[0m  ${violation}: ${(error as Error).message.split('\n')[0]}`,
        )
      }
    }
    console.log(`  — ${String(audits.length)} audits, ${String(failures)} with findings`)

    heading('2. Constraints and indices: declared vs. present')
    const declared = [
      ...allRules(entities, [])
        .map((rule) => statementFor(rule, profile))
        .filter((statement): statement is string => statement !== null),
      ...entities.flatMap((entity) => indexStatementsFor(entity, profile).statements),
    ]
    const present = await session.readTransaction(async (transaction) => {
      const constraints = await transaction.run('SHOW CONSTRAINTS')
      const indices = await transaction.run('SHOW INDEXES')
      // 4.4 returns [id, name, type, entityType, labelsOrTypes, properties, ownedIndexId] —
      // there is no rendered description, so it is assembled here.
      const describe = (record: { get: (key: string) => unknown }): string =>
        `${String(record.get('name'))} ${String(record.get('type'))} ` +
        `${JSON.stringify(record.get('labelsOrTypes'))}${JSON.stringify(record.get('properties'))}`
      return [...constraints.records.map(describe), ...indices.records.map(describe)]
    })
    console.log(`  declared: ${String(declared.length)}`)
    for (const statement of declared) {
      console.log(`    ${statement}`)
    }
    console.log(`  present in database: ${String(present.length)}`)
    for (const item of present) {
      console.log(`    ${item}`)
    }

    heading('3. Labels and relationship types the registry does not declare')
    const { dbLabels, dbTypes } = await session.readTransaction(async (transaction) => {
      const labelResult = await transaction.run('CALL db.labels()')
      const typeResult = await transaction.run('CALL db.relationshipTypes()')
      return {
        dbLabels: labelResult.records.map((record) => String(record.get('label'))),
        dbTypes: typeResult.records.map((record) => String(record.get('relationshipType'))),
      }
    })
    const undeclaredLabels = dbLabels.filter((label) => !labels().includes(label))
    const undeclaredTypes = dbTypes.filter((type) => !relationshipTypes().includes(type))
    console.log(`  labels in database:    ${String(dbLabels.length)} (${dbLabels.join(', ')})`)
    console.log(`  not declared:         ${undeclaredLabels.join(', ') || '—'}`)
    console.log(`  rel types in database: ${String(dbTypes.length)}`)
    console.log(`  not declared:         ${undeclaredTypes.join(', ') || '—'}`)
  } finally {
    await session.close()
    await closeDriver()
  }

  return failures
}

const run = async (): Promise<void> => {
  try {
    const failures = await main()
    heading(failures === 0 ? 'No findings.' : `${String(failures)} finding(s).`)
    process.exit(0)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

void run()
