/* eslint-disable no-console */
import { closeDriver, getDriver } from '@db/neo4j'
import { applyPlan, enforce, planConstraints } from '@db/schema/derive/apply'
import { auditsFor } from '@db/schema/derive/audit'
import {
  compareSchemaObjects,
  declaredIndexStatements,
  declaredObjects,
  describeSchemaObject,
  inexpressibleObjects,
  isKnownProfile,
} from '@db/schema/derive/drift'
import { allRules } from '@db/schema/derive/rules'
import { runnerFor } from '@db/schema/derive/runner'
import { entities, labels, relationships, relationshipTypes } from '@db/schema/index'

import type { Enforcement } from '@db/schema/derive/apply'
import type { BackendProfile } from '@db/schema/derive/ddl'
import type { SchemaObject } from '@db/schema/derive/drift'
import type { Session } from 'neo4j-driver'

// The operator tool for the declaration in this folder.
//
//   yarn tsx src/db/schema/run-audit.ts check [profile]
//   yarn tsx src/db/schema/run-audit.ts apply [profile] [--strict]
//
// `check` never writes and exits non-zero on findings. Run it against a restored production
// dump before a release — and with the TARGET profile before switching backends: `check
// memgraph` against a Neo4j database answers what would break after a Memgraph migration,
// before anything is migrated.
//
// `apply` audits each constraint before creating it, so a violating row becomes a skipped
// object plus a report instead of an aborted deployment. `--strict` (CI, dev) makes any skip
// an error; without it (production) only a statement that ERRORED does.

// Flags are filtered out before the positional arguments are read: `apply --strict` used to
// take "--strict" as the profile name, because the profile is simply argv[3].
const argv = process.argv.slice(2)
const flags = argv.filter((argument) => argument.startsWith('--'))
const positional = argv.filter((argument) => !argument.startsWith('--'))
const [commandArgument, profileArgument] = positional
const command = commandArgument ?? 'check'
const profileInput = profileArgument ?? 'neo4j-community'
const strict = flags.includes('--strict')

/**
 * Every flag this tool accepts, so that anything else is an error rather than a shrug.
 *
 * `--strict` is the only one, and it is the one that matters: it turns a skipped constraint into
 * a failure, which is what makes the CI step a gate. Unrecognised flags used to be dropped, so
 * `apply neo4j-community --strikt` ran in report mode, a skip was no longer an error, the
 * command exited 0 and the typo was the only trace. The rest of this file already refuses an
 * unknown command and an unknown profile; a flag is not different.
 */
const KNOWN_FLAGS = ['--strict']

const heading = (text: string): void => {
  console.log(`\n\x1b[1m${text}\x1b[0m`)
}

/**
 * Which of our two constraint kinds a `SHOW CONSTRAINTS` row is.
 *
 * The column was previously discarded and every row filed as "a constraint". A property that is
 * both unique and required — User.id — then had its uniqueness constraint answer for its
 * existence constraint, and a missing one was reported as present. NODE KEY counts as unique
 * because that is how statementFor spells a composite uniqueness rule on enterprise; that it
 * also implies presence is the audit's business, not this comparison's.
 */
const constraintKind = (type: string): SchemaObject['kind'] =>
  type.includes('EXISTENCE') ? 'exists' : 'unique'

/** What `SHOW CONSTRAINTS` / `SHOW INDEXES` report, mapped onto the comparison shape. */
const presentObjects = async (session: Session): Promise<SchemaObject[]> => {
  const constraints = await session.run('SHOW CONSTRAINTS')
  const indices = await session.run('SHOW INDEXES')
  const constraintNames = new Set(constraints.records.map((record) => String(record.get('name'))))
  return [
    ...constraints.records.map((record): SchemaObject => ({
      kind: constraintKind(String(record.get('type'))),
      label: (record.get('labelsOrTypes') as string[])[0],
      properties: record.get('properties') as string[],
    })),
    ...indices.records
      // Neo4j reports the index BACKING a uniqueness constraint in SHOW INDEXES under the
      // constraint's own name. Listing it as an unwanted index would be noise about something
      // that cannot exist on its own. LOOKUP indices carry no label and are built in.
      .filter(
        (record) =>
          !constraintNames.has(String(record.get('name'))) &&
          String(record.get('type')) !== 'LOOKUP',
      )
      .map((record): SchemaObject => ({
        kind: 'index',
        label: (record.get('labelsOrTypes') as string[])[0],
        properties: record.get('properties') as string[],
      })),
  ]
}

const reportAudits = async (session: Session, profile: BackendProfile): Promise<number> => {
  heading(`1. Declared rules that ${profile} cannot enforce`)
  const audits = auditsFor(allRules(entities, relationships), profile)
  const runner = runnerFor(session)
  let findings = 0

  for (const { violation, cypher, sampleCypher } of audits) {
    try {
      const violations = await runner.count(cypher)
      if (violations === 0) {
        console.log(`  ok    ${violation}`)
        continue
      }
      findings += 1
      console.log(`  \x1b[31mFAIL\x1b[0m  ${violation}: ${String(violations)}`)
      for (const row of await runner.sample(sampleCypher)) {
        console.log(`          ${JSON.stringify(row)}`)
      }
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      findings += 1
      console.log(`  \x1b[33mERR \x1b[0m  ${violation}: ${(error as Error).message.split('\n')[0]}`)
    }
  }
  console.log(`  — ${String(audits.length)} audits, ${String(findings)} with findings`)
  return findings
}

const reportDrift = async (session: Session, profile: BackendProfile): Promise<number> => {
  heading('2. Constraints and indices: declared vs. present')
  const { missing, surplus } = compareSchemaObjects(
    declaredObjects(entities, profile),
    await presentObjects(session),
  )
  // An object this profile cannot express is reported ONCE, as UNSUPPORTED. It is not
  // declared for this profile (so it cannot be missing), and where the database happens to
  // hold one it is not surplus either — "declared nowhere" would be untrue and would invite
  // dropping an index the current backend needs.
  const inexpressible = new Set(
    inexpressibleObjects(entities, profile).map((object) => describeSchemaObject(object)),
  )
  const unwanted = surplus.filter((object) => !inexpressible.has(describeSchemaObject(object)))
  for (const object of missing) {
    console.log(`  \x1b[33mMISSING\x1b[0m ${describeSchemaObject(object)}`)
  }
  for (const object of unwanted) {
    // Never dropped automatically: a typo in a declaration would otherwise turn into
    // data-availability loss on the next deployment.
    console.log(`  \x1b[33mSURPLUS\x1b[0m ${describeSchemaObject(object)} (declared nowhere)`)
  }
  const { unsupported } = declaredIndexStatements(entities, profile)
  for (const item of unsupported) {
    console.log(`  \x1b[33mUNSUPPORTED\x1b[0m ${item} — ${profile} cannot express it`)
  }
  if (missing.length === 0 && unwanted.length === 0) {
    // "in sync" only when there is nothing left to say. An object this profile cannot express
    // is not drift — no apply run can create it and no operator can clear it, so counting it
    // as a finding would make `check memgraph` red forever by construction. But it is also not
    // nothing, and the summary must not read as if it were.
    console.log(
      unsupported.length === 0
        ? '  in sync'
        : `  in sync, except ${String(unsupported.length)} object(s) ${profile} cannot express`,
    )
  }
  // Deliberately NOT counting `unsupported`: the exit code says "there is work to do here",
  // and there is none — the apply path makes the same call, `enforce()` looks at skipped and
  // failed only.
  return missing.length + unwanted.length
}

const reportRegistry = async (session: Session): Promise<number> => {
  heading('3. Labels and relationship types the registry does not declare')
  const labelResult = await session.run('CALL db.labels()')
  const typeResult = await session.run('CALL db.relationshipTypes()')
  const undeclaredLabels = labelResult.records
    .map((record) => String(record.get('label')))
    .filter((label) => !labels().includes(label))
  const undeclaredTypes = typeResult.records
    .map((record) => String(record.get('relationshipType')))
    .filter((type) => !relationshipTypes().includes(type))
  console.log(`  undeclared labels:    ${undeclaredLabels.join(', ') || '—'}`)
  console.log(`  undeclared rel types: ${undeclaredTypes.join(', ') || '—'}`)
  return undeclaredLabels.length + undeclaredTypes.length
}

const check = async (session: Session, profile: BackendProfile): Promise<number> => {
  const audits = await reportAudits(session, profile)
  const drift = await reportDrift(session, profile)
  const registry = await reportRegistry(session)
  return audits + drift + registry
}

const apply = async (
  session: Session,
  profile: BackendProfile,
  enforcement: Enforcement,
): Promise<number> => {
  heading(`Applying the declaration to ${profile} (${enforcement})`)
  const { statements, unsupported } = declaredIndexStatements(entities, profile)
  const report = await applyPlan(
    runnerFor(session),
    planConstraints(entities, relationships, profile),
    statements,
    unsupported,
  )

  console.log(
    `  applied: ${String(report.applied.length)}, ` +
      `already in place: ${String(report.unchanged.length)}`,
  )
  for (const name of report.superseded) {
    // The one DROP this tool performs, and never silently: the constraint on the same key
    // replaces the index, and Neo4j 4.4 will not create it while the index is there.
    console.log(`  \x1b[33mSUPERSEDED\x1b[0m index ${name} — replaced by its constraint`)
  }
  for (const item of report.skipped) {
    console.log(
      `  \x1b[33mSKIPPED\x1b[0m ${item.violation}: ${String(item.violations)} violation(s)`,
    )
    for (const row of item.sample) {
      console.log(`          ${JSON.stringify(row)}`)
    }
    console.log(`          would have been: ${item.statement}`)
  }
  for (const item of report.failed) {
    console.log(`  \x1b[31mFAILED\x1b[0m ${item.code}: ${item.message}`)
    console.log(`          ${item.statement}`)
  }
  for (const item of report.unsupported) {
    console.log(`  \x1b[33mUNSUPPORTED\x1b[0m ${item}`)
  }

  try {
    enforce(report, enforcement)
    return 0
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.log(`\n${(error as Error).message}`)
    return report.skipped.length + report.failed.length
  }
}

const main = async (): Promise<number> => {
  const unknownFlags = flags.filter((flag) => !KNOWN_FLAGS.includes(flag))
  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(', ')} (expected ${KNOWN_FLAGS.join(', ')})`,
    )
    return 1
  }
  if (positional.length > 2) {
    // An argument nobody reads is a typo with no trace, same as an unknown flag.
    console.error(`Unexpected argument(s): ${positional.slice(2).join(', ')}`)
    return 1
  }
  if (!isKnownProfile(profileInput)) {
    console.error(`Unknown profile: ${profileInput}`)
    return 1
  }
  if (command !== 'check' && command !== 'apply') {
    console.error(`Unknown command: ${command} (expected 'check' or 'apply')`)
    return 1
  }
  const session = getDriver().session()
  try {
    return command === 'apply'
      ? await apply(session, profileInput, strict ? 'strict' : 'report')
      : await check(session, profileInput)
  } finally {
    await session.close()
    await closeDriver()
  }
}

const run = async (): Promise<void> => {
  try {
    const findings = await main()
    heading(findings === 0 ? 'No findings.' : `${String(findings)} finding(s).`)
    // The non-zero exit is what makes this usable as a CI gate and as a pre-release check.
    process.exit(findings === 0 ? 0 : 1)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    console.error(error)
    process.exit(2)
  }
}

void run()
