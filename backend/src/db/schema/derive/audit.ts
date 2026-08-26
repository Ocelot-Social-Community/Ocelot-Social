import { capabilitiesFor, statementFor } from './ddl'
import { scopeLabel } from './rules'

import type { BackendProfile } from './ddl'
import type { Rule, Scope } from './rules'
import type { PropertyType } from '@db/schema/types'

// The complement of derive/ddl.ts: a Cypher query per rule the backend cannot enforce.
//
// These queries enforce nothing. They make violations COUNTABLE, which is the difference
// between "the model says users have exactly one role" and knowing whether they do. Run as an
// integration test against the seeded database (CI gate) and, for the rules that matter
// operationally, against production.

export interface AuditQuery {
  /** Stable identifier, used as the test name and as the metric label. */
  readonly violation: string
  /** Counts violations. Cheap enough to run over every rule on every deployment. */
  readonly cypher: string
  /**
   * Up to ten offending records, as `id` + `detail` columns.
   *
   * A SEPARATE query rather than a `collect()` in the one above, because it is only ever run
   * when the count came back non-zero — which is the exceptional case. The normal path stays
   * a plain count.
   *
   * It exists because Neo4j's own error is not enough to act on: creating a constraint over
   * violating data reports exactly ONE conflicting pair ("Both Node(6141) and Node(6142)
   * have ..."), however many there are.
   */
  readonly sampleCypher: string
}

// Neo4j 4.4 has no valueType(); apoc.meta.cypher.type() is the portable way to ask.
const CYPHER_TYPE_PREDICATE = new Map<PropertyType, (value: string) => string>([
  ['string', (value) => `apoc.meta.cypher.type(${value}) <> 'STRING'`],
  ['boolean', (value) => `apoc.meta.cypher.type(${value}) <> 'BOOLEAN'`],
  ['integer', (value) => `apoc.meta.cypher.type(${value}) <> 'INTEGER'`],
  // `x NOT IN [...]` is not Cypher; the negation goes in front of the whole predicate.
  ['number', (value) => `NOT apoc.meta.cypher.type(${value}) IN ['INTEGER', 'FLOAT']`],
  ['datetime', (value) => `apoc.meta.cypher.type(${value}) <> 'DATE_TIME'`],
])

// Both scopes bind the alias `n`, so every predicate is written once and reads the same.
const matchFor = (scope: Scope): string =>
  'node' in scope ? `MATCH (n:${scope.node})` : `MATCH ()-[n:${scope.edge}]->()`

const SAMPLE_LIMIT = '10'

const propertyAudit = (
  scope: Scope,
  violation: string,
  where: string,
  property: string,
): AuditQuery => ({
  violation,
  cypher: `${matchFor(scope)} WHERE ${where} RETURN count(n) AS violations`,
  sampleCypher:
    `${matchFor(scope)} WHERE ${where} ` +
    `RETURN id(n) AS id, n.${property} AS detail LIMIT ${SAMPLE_LIMIT}`,
})

const literal = (value: unknown): string =>
  typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value)

/**
 * Whether this profile would spell the rule as `IS NODE KEY` rather than as uniqueness.
 *
 * The distinction is presence: a node key demands the properties exist, a uniqueness
 * constraint ignores the nodes that lack them. Derived from the same capability table
 * statementFor() uses, so the two cannot drift apart.
 */
const spelledAsNodeKey = (rule: Rule, profile: BackendProfile): boolean => {
  if (rule.kind !== 'unique' || rule.properties.length < 2) {
    return false
  }
  const capabilities = capabilitiesFor(profile)
  return capabilities.dialect === 'neo4j' && capabilities.compositeUnique
}

/**
 * The audit for one rule, regardless of whether any backend enforces it.
 *
 * Separate from `auditFor` because the two callers want opposite things: the reporting run
 * wants the COMPLEMENT of what the backend enforces, while the apply run wants the audit for
 * exactly those rules it is about to turn into constraints — as a pre-flight check.
 *
 * The profile is needed even though the audit runs no DDL: what counts as a violation can
 * depend on which constraint the backend would create (see the uniqueness case). It is also
 * what makes `check memgraph` against a Neo4j database mean "what would break after the
 * migration" rather than "what breaks here".
 *
 * Returns null only where no query can express the rule (a data type nothing can be asked
 * about); rules.spec.ts pins that this never happens for the declared registry.
 */
export const auditQueryFor = (rule: Rule, profile: BackendProfile): AuditQuery | null => {
  switch (rule.kind) {
    case 'unique': {
      const properties = rule.properties.map((property) => `n.${property}`).join(', ')
      // Nodes WITHOUT the property are excluded, because a uniqueness constraint does not
      // apply to them: counting them would report a violation the database is perfectly happy
      // with. Not academic — `Post.slug` is declared unique but NOT required, and two slugless
      // posts share the key `[null]`. planConstraints() runs this very query as the pre-flight
      // for the constraint it is about to create, so the false count would SKIP
      // `Post_slug_unique`: an error under `strict` (CI, dev) and a constraint that silently
      // never gets created in production. Presence is a separate rule (`exists`) and stays
      // there.
      //
      // The one exception is a composite key on a profile that spells it `IS NODE KEY` (see
      // ddl.ts), because THAT constraint does require presence — excluding the nodes would let
      // the pre-flight pass and the CREATE fail, which lands in `failed` and stops the
      // deployment in every enforcement mode. Hence the profile: the audit mirrors the
      // constraint this backend would actually create, and where it can create none, it
      // mirrors plain uniqueness.
      const guard = spelledAsNodeKey(rule, profile)
        ? ''
        : ` WHERE ${rule.properties.map((property) => `n.${property} IS NOT NULL`).join(' AND ')}`
      return {
        violation: `${rule.label}.${rule.properties.join('+')} unique`,
        cypher:
          `MATCH (n:${rule.label})${guard} WITH [${properties}] AS key, count(*) AS nodes ` +
          `WHERE nodes > 1 RETURN count(key) AS violations`,
        sampleCypher:
          `MATCH (n:${rule.label})${guard} WITH [${properties}] AS key, collect(id(n)) AS ids ` +
          `WHERE size(ids) > 1 RETURN head(ids) AS id, key AS detail LIMIT ${SAMPLE_LIMIT}`,
      }
    }

    case 'exists':
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} exists`,
        `n.${rule.property} IS NULL`,
        rule.property,
      )

    case 'dataType': {
      const types = rule.types.filter((type) => type !== 'null')
      const predicates = types
        .map((type) => CYPHER_TYPE_PREDICATE.get(type)?.(`n.${rule.property}`))
        .filter((predicate): predicate is string => predicate !== undefined)
      // Every listed type must be one we can ask about, otherwise the query would report
      // violations for a type it simply does not know.
      if (predicates.length !== types.length || predicates.length === 0) {
        return null
      }
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} type`,
        `n.${rule.property} IS NOT NULL AND ${predicates.join(' AND ')}`,
        rule.property,
      )
    }

    case 'pattern':
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} pattern`,
        `n.${rule.property} IS NOT NULL AND NOT n.${rule.property} =~ '${rule.pattern}'`,
        rule.property,
      )

    case 'minLength':
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} minLength`,
        `n.${rule.property} IS NOT NULL AND size(n.${rule.property}) < ${String(rule.minLength)}`,
        rule.property,
      )

    case 'minimum':
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} minimum`,
        `n.${rule.property} IS NOT NULL AND n.${rule.property} < ${String(rule.minimum)}`,
        rule.property,
      )

    case 'enum': {
      const allowed = rule.values.filter((value) => value !== null)
      return propertyAudit(
        rule.scope,
        `${scopeLabel(rule.scope)}.${rule.property} enum`,
        `n.${rule.property} IS NOT NULL AND NOT n.${rule.property} IN [${allowed.map(literal).join(', ')}]`,
        rule.property,
      )
    }

    case 'cardinality': {
      const comparison = rule.cardinality === 'exactly-one' ? '<> 1' : '> 1'
      // One source label goes into the pattern, several stay a disjunction — Cypher has no
      // `(n:A|B)` for a node.
      //
      // NOT a Neo4j optimisation, and worth saying so before someone "fixes" it back: measured
      // with EXPLAIN on 4.4, `MATCH (n) WHERE n:User` and `MATCH (n:User)` produce the same
      // NodeByLabelScan, and the two-label disjunction produces two of them. The planner folds
      // the predicate either way. It is written this way because the pattern says what the
      // query means without a planner having to infer it, and because this generator also
      // targets Memgraph, whose planner makes its own choices — the form that needs no
      // inference is the one that cannot lose it.
      const match =
        rule.from.length === 1
          ? `MATCH (n:${rule.from[0]})`
          : `MATCH (n) WHERE ${rule.from.map((label) => `n:${label}`).join(' OR ')}`
      const degree =
        `${match} ` +
        `WITH n, size([(n)-[:${rule.type}]->() | 1]) AS edges ` +
        `WHERE edges ${comparison} `
      return {
        violation: `${rule.from.join('|')}-[:${rule.type}] ${rule.cardinality}`,
        cypher: `${degree}RETURN count(n) AS violations`,
        sampleCypher: `${degree}RETURN id(n) AS id, edges AS detail LIMIT ${SAMPLE_LIMIT}`,
      }
    }

    case 'endpoints': {
      // Both lists are disjunctions: the edge is fine if it starts at ANY declared source
      // label and points at ANY declared target label.
      const wrongSource = rule.from.map((label) => `NOT a:${label}`).join(' AND ')
      const wrongTarget = rule.to.map((label) => `NOT b:${label}`).join(' AND ')
      const wrong = `MATCH (a)-[r:${rule.type}]->(b) WHERE (${wrongSource}) OR (${wrongTarget}) `
      return {
        violation: `[:${rule.type}] endpoints ${rule.from.join('|')}->${rule.to.join('|')}`,
        cypher: `${wrong}RETURN count(r) AS violations`,
        sampleCypher: `${wrong}RETURN id(r) AS id, [labels(a), labels(b)] AS detail LIMIT ${SAMPLE_LIMIT}`,
      }
    }
  }
}

/** The audit for one rule, or null if the rule needs none because the backend enforces it. */
export const auditFor = (rule: Rule, profile: BackendProfile): AuditQuery | null =>
  statementFor(rule, profile) !== null ? null : auditQueryFor(rule, profile)

export const auditsFor = (rules: readonly Rule[], profile: BackendProfile): AuditQuery[] =>
  rules
    .map((rule) => auditFor(rule, profile))
    .filter((audit): audit is AuditQuery => audit !== null)
