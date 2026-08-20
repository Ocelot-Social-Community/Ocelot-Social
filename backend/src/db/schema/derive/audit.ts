import { statementFor } from './ddl'

import type { BackendProfile } from './ddl'
import type { Rule } from './rules'
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
  readonly cypher: string
}

// Neo4j 4.4 has no valueType(); apoc.meta.cypher.type() is the portable way to ask.
const CYPHER_TYPE_PREDICATE = new Map<PropertyType, (value: string) => string>([
  ['string', (value) => `apoc.meta.cypher.type(${value}) <> 'STRING'`],
  ['boolean', (value) => `apoc.meta.cypher.type(${value}) <> 'BOOLEAN'`],
  ['integer', (value) => `apoc.meta.cypher.type(${value}) <> 'INTEGER'`],
  ['number', (value) => `apoc.meta.cypher.type(${value}) NOT IN ['INTEGER', 'FLOAT']`],
])

const nodeAudit = (label: string, violation: string, where: string): AuditQuery => ({
  violation,
  cypher: `MATCH (n:${label}) WHERE ${where} RETURN count(n) AS violations`,
})

const literal = (value: unknown): string =>
  typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value)

/** The audit for one rule, or null if the rule needs none because the backend enforces it. */
export const auditFor = (rule: Rule, profile: BackendProfile): AuditQuery | null => {
  if (statementFor(rule, profile) !== null) {
    return null
  }

  switch (rule.kind) {
    case 'unique': {
      const properties = rule.properties.map((property) => `n.${property}`).join(', ')
      return {
        violation: `${rule.label}.${rule.properties.join('+')} unique`,
        cypher:
          `MATCH (n:${rule.label}) WITH [${properties}] AS key, count(*) AS nodes ` +
          `WHERE nodes > 1 RETURN count(key) AS violations`,
      }
    }

    case 'exists':
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} exists`,
        `n.${rule.property} IS NULL`,
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
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} type`,
        `n.${rule.property} IS NOT NULL AND ${predicates.join(' AND ')}`,
      )
    }

    case 'pattern':
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} pattern`,
        `n.${rule.property} IS NOT NULL AND NOT n.${rule.property} =~ '${rule.pattern}'`,
      )

    case 'minLength':
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} minLength`,
        `n.${rule.property} IS NOT NULL AND size(n.${rule.property}) < ${String(rule.minLength)}`,
      )

    case 'minimum':
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} minimum`,
        `n.${rule.property} IS NOT NULL AND n.${rule.property} < ${String(rule.minimum)}`,
      )

    case 'enum': {
      const allowed = rule.values.filter((value) => value !== null)
      return nodeAudit(
        rule.label,
        `${rule.label}.${rule.property} enum`,
        `n.${rule.property} IS NOT NULL AND NOT n.${rule.property} IN [${allowed.map(literal).join(', ')}]`,
      )
    }

    case 'cardinality': {
      const comparison = rule.cardinality === 'exactly-one' ? '<> 1' : '> 1'
      return {
        violation: `${rule.from}-[:${rule.type}] ${rule.cardinality}`,
        cypher:
          `MATCH (n:${rule.from}) ` +
          `WITH n, size([(n)-[:${rule.type}]->() | 1]) AS edges ` +
          `WHERE edges ${comparison} RETURN count(n) AS violations`,
      }
    }

    case 'endpoints':
      return {
        violation: `[:${rule.type}] endpoints ${rule.from}->${rule.to}`,
        cypher:
          `MATCH (a)-[r:${rule.type}]->(b) ` +
          `WHERE NOT a:${rule.from} OR NOT b:${rule.to} ` +
          `RETURN count(r) AS violations`,
      }
  }
}

export const auditsFor = (rules: readonly Rule[], profile: BackendProfile): AuditQuery[] =>
  rules
    .map((rule) => auditFor(rule, profile))
    .filter((audit): audit is AuditQuery => audit !== null)
