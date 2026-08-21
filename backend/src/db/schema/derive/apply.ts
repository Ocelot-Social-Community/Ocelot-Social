import { auditQueryFor } from './audit'
import { statementFor } from './ddl'
import { allRules } from './rules'

import type { BackendProfile } from './ddl'
import type { Rule } from './rules'
import type { EntityDefinition, RelationshipDefinition } from '@db/schema/types'

// Bringing the database in line with the declaration, without letting one bad row take the
// deployment down with it.
//
// Measured against Neo4j 4.4, because the failure mode drives the whole design:
//
//   CREATE CONSTRAINT x IF NOT EXISTS FOR (n:L) REQUIRE n.p IS UNIQUE
//   -> Neo.DatabaseError.Schema.ConstraintCreationFailed
//      "Unable to create Constraint(...): Both Node(6141) and Node(6142) have the label
//       `L` and property `p` = 'dup'"
//
// Three things follow from that:
//
//   1. `IF NOT EXISTS` guards against an EXISTING CONSTRAINT, not against violating data. It
//      is no safety net at all for this case.
//   2. The error names exactly ONE conflicting pair, however many exist — useless for repair.
//      Hence the pre-flight audit, which counts them and can sample them.
//   3. It is a DatabaseError, not a ClientError. Generic retry logic treats that as transient
//      and will happily retry a statement that can never succeed.
//
// So: audit first, then create only what the data supports, and wrap every statement on its
// own. A constraint that is skipped leaves the database exactly as it already is — which is
// strictly better than an aborted deployment.

/** How the caller wants violations treated. */
export type Enforcement =
  /** CI, dev, test: any skipped or failed object is an error. Data is disposable there. */
  | 'strict'
  /** Production: report and carry on. A missing constraint is the status quo, not a regression. */
  | 'report'

export interface PlanItem {
  readonly statement: string
  /** Present for rules whose data can make the statement fail; absent for indexes. */
  readonly rule?: Rule
  readonly violation?: string
  readonly auditCypher?: string
  readonly sampleCypher?: string
}

export interface SkippedItem {
  readonly statement: string
  readonly violation: string
  readonly violations: number
  readonly sample: unknown[]
}

export interface FailedItem {
  readonly statement: string
  readonly code: string
  readonly message: string
}

export interface ApplyReport {
  readonly applied: string[]
  /**
   * Statements whose end state already held. Reported separately from `applied` rather than
   * folded into it, so a run over an untouched database reads as "nothing to do" instead of
   * claiming work it did not do.
   */
  readonly unchanged: string[]
  readonly skipped: SkippedItem[]
  readonly failed: FailedItem[]
  readonly unsupported: string[]
}

/**
 * Neo4j 4.4 has no `CREATE FULLTEXT INDEX ... IF NOT EXISTS` — that arrived in 5.x. The 4.4
 * spelling is the procedure `db.index.fulltext.createNodeIndex`, and it is NOT idempotent:
 * called twice it throws `EquivalentSchemaRuleAlreadyExistsException`.
 *
 * That exception says the desired end state already holds, which is success by any useful
 * definition. It is recognised HERE rather than swallowed at the call site, so the one
 * "already exists" case is distinguishable from every other procedure failure.
 */
const isAlreadySatisfied = (error: unknown): boolean =>
  (error as Error | null)?.message?.includes('EquivalentSchemaRuleAlreadyExists') === true

/**
 * The database operations this module needs, as a port.
 *
 * Injected rather than taken from `@db/neo4j` so the sequencing — which is the actual logic
 * here — is testable without a database. The scripts wire the real driver in.
 */
export interface SchemaRunner {
  count: (cypher: string) => Promise<number>
  sample: (cypher: string) => Promise<unknown[]>
  execute: (cypher: string) => Promise<void>
}

/** Constraint statements plus their pre-flight audit, in declaration order. */
export const planConstraints = (
  entities: readonly EntityDefinition[],
  relationships: readonly RelationshipDefinition[],
  profile: BackendProfile,
): PlanItem[] => {
  const items: PlanItem[] = []
  for (const rule of allRules(entities, relationships)) {
    const statement = statementFor(rule, profile)
    if (statement === null) {
      continue
    }
    // `auditQueryFor`, not `auditFor`: the latter deliberately returns null for rules the
    // backend enforces, which is exactly the set being planned here. The pre-flight needs the
    // query for the constraint it is about to create.
    const audit = auditQueryFor(rule, profile)
    items.push({
      statement,
      rule,
      violation: audit?.violation,
      auditCypher: audit?.cypher,
      sampleCypher: audit?.sampleCypher,
    })
  }
  return items
}

const errorCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown'

/**
 * Runs a plan. Never throws for a data problem — the caller decides what a report means (see
 * `enforce`). It does propagate connection-level failures, because those are not about data.
 */
export const applyPlan = async (
  runner: SchemaRunner,
  items: readonly PlanItem[],
  indexStatements: readonly string[] = [],
  unsupported: readonly string[] = [],
): Promise<ApplyReport> => {
  const applied: string[] = []
  const unchanged: string[] = []
  const skipped: SkippedItem[] = []
  const failed: FailedItem[] = []

  // Indexes first, and without a pre-flight: an index is built over whatever is there and
  // cannot fail on data. Doing them first means a rejected constraint never costs us one.
  for (const statement of indexStatements) {
    try {
      await runner.execute(statement)
      applied.push(statement)
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      if (isAlreadySatisfied(error)) {
        unchanged.push(statement)
        continue
      }
      failed.push({
        statement,
        code: errorCode(error),
        message: (error as Error).message.split('\n')[0],
      })
    }
  }

  for (const item of items) {
    if (item.auditCypher !== undefined) {
      const violations = await runner.count(item.auditCypher)
      if (violations > 0) {
        skipped.push({
          statement: item.statement,
          violation: item.violation ?? item.statement,
          violations,
          sample: item.sampleCypher === undefined ? [] : await runner.sample(item.sampleCypher),
        })
        continue
      }
    }
    try {
      await runner.execute(item.statement)
      applied.push(item.statement)
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (error) {
      if (isAlreadySatisfied(error)) {
        unchanged.push(item.statement)
        continue
      }
      // Reached when data changed between the audit and the statement, or when the profile
      // claims a capability the server does not have.
      failed.push({
        statement: item.statement,
        code: errorCode(error),
        message: (error as Error).message.split('\n')[0],
      })
    }
  }

  return { applied, unchanged, skipped, failed, unsupported: [...unsupported] }
}

export class SchemaEnforcementError extends Error {}

/**
 * Turns a report into a verdict.
 *
 * `strict` fails on anything that did not go in. `report` fails only on a statement that
 * ERRORED — a skip is a known data problem that was decided about, an error is not.
 */
export const enforce = (report: ApplyReport, enforcement: Enforcement): void => {
  const problems =
    enforcement === 'strict'
      ? [...report.skipped.map((item) => item.violation), ...report.failed.map((i) => i.statement)]
      : report.failed.map((item) => item.statement)
  if (problems.length > 0) {
    throw new SchemaEnforcementError(
      `Schema not fully applied (${enforcement}): ${problems.join('; ')}`,
    )
  }
}
