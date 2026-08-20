import type { Rule } from './rules'
import type { EntityDefinition, PropertyType } from '@db/schema/types'

// Constraint and index DDL, as a function of the declaration AND the backend.
//
// The same declaration yields more enforcement on a backend that can do more, and more audit
// queries (derive/audit.ts) on one that can do less. Nothing is silently dropped: whatever a
// profile cannot enforce is what audit.ts picks up.

export type BackendProfile = 'neo4j-community' | 'neo4j-enterprise' | 'memgraph'

interface Capabilities {
  /** Single-property uniqueness. Every backend we target has this. */
  readonly unique: boolean
  /** Uniqueness across several properties in one constraint. */
  readonly compositeUnique: boolean
  /** "property must be present" — Neo4j calls it existence, Memgraph EXISTS. */
  readonly existence: boolean
  /** "property must be of type X" — Memgraph only; Neo4j 4.4 has no such constraint. */
  readonly dataType: boolean
  readonly dialect: 'neo4j' | 'memgraph'
}

// A Map rather than a Record: the profile is looked up by a runtime value, and an object
// index with a variable key is exactly the pattern the security lint flags.
export const CAPABILITIES = new Map<BackendProfile, Capabilities>([
  // Neo4j 4.4 Community: uniqueness and indexes, nothing else. Composite uniqueness exists
  // only as NODE KEY, which is an Enterprise feature.
  [
    'neo4j-community',
    { unique: true, compositeUnique: false, existence: false, dataType: false, dialect: 'neo4j' },
  ],
  // Neo4j 4.4 Enterprise: adds existence constraints and NODE KEY. Type constraints did not
  // arrive before Neo4j 5.9, so they stay unenforced here too.
  [
    'neo4j-enterprise',
    { unique: true, compositeUnique: true, existence: true, dataType: false, dialect: 'neo4j' },
  ],
  // Memgraph's free edition carries all three constraint classes, including native composite
  // uniqueness and IS TYPED. This is the profile that enforces the most of our declaration —
  // relevant for the paused Memgraph migration.
  [
    'memgraph',
    { unique: true, compositeUnique: true, existence: true, dataType: true, dialect: 'memgraph' },
  ],
])

const capabilitiesFor = (profile: BackendProfile): Capabilities => {
  const capabilities = CAPABILITIES.get(profile)
  if (capabilities === undefined) {
    throw new Error(`Unknown backend profile: ${profile}`)
  }
  return capabilities
}

/** The single non-null type of a property, or null if it is a union we cannot express. */
const soleType = (types: PropertyType[]): PropertyType | null => {
  const withoutNull = types.filter((type) => type !== 'null')
  return withoutNull.length === 1 ? withoutNull[0] : null
}

const MEMGRAPH_TYPE = new Map<PropertyType, string>([
  ['string', 'STRING'],
  ['boolean', 'BOOLEAN'],
  ['integer', 'INTEGER'],
  ['number', 'FLOAT'],
])

/**
 * The DDL statement enforcing this rule, or null if the profile cannot enforce it.
 *
 * Returning null rather than throwing is what makes the audit complement work: audit.ts asks
 * the same question and takes everything this returns null for.
 */
export const statementFor = (rule: Rule, profile: BackendProfile): string | null => {
  const capabilities = capabilitiesFor(profile)
  const neo4j = capabilities.dialect === 'neo4j'

  switch (rule.kind) {
    case 'unique': {
      const composite = rule.properties.length > 1
      if (composite && !capabilities.compositeUnique) {
        return null
      }
      if (neo4j) {
        const name = `${rule.label}_${rule.properties.join('_')}_${composite ? 'key' : 'unique'}`
        const properties = rule.properties.map((property) => `n.${property}`).join(', ')
        const predicate = composite ? `(${properties}) IS NODE KEY` : `${properties} IS UNIQUE`
        return `CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:${rule.label}) REQUIRE ${predicate}`
      }
      const properties = rule.properties.map((property) => `n.${property}`).join(', ')
      return `CREATE CONSTRAINT ON (n:${rule.label}) ASSERT ${properties} IS UNIQUE`
    }

    case 'exists': {
      // Neither Neo4j nor Memgraph constrains edge properties, so an edge-scoped rule is
      // always left to the audit.
      if (!capabilities.existence || !('node' in rule.scope)) {
        return null
      }
      const label = rule.scope.node
      if (neo4j) {
        return (
          `CREATE CONSTRAINT ${label}_${rule.property}_exists IF NOT EXISTS ` +
          `FOR (n:${label}) REQUIRE n.${rule.property} IS NOT NULL`
        )
      }
      return `CREATE CONSTRAINT ON (n:${label}) ASSERT EXISTS (n.${rule.property})`
    }

    case 'dataType': {
      if (!capabilities.dataType || !('node' in rule.scope)) {
        return null
      }
      const type = soleType(rule.types)
      // A union wider than `X | null` has no single IS TYPED to name, so it stays audited.
      if (type === null) {
        return null
      }
      const memgraphType = MEMGRAPH_TYPE.get(type)
      if (memgraphType === undefined) {
        return null
      }
      return (
        `CREATE CONSTRAINT ON (n:${rule.scope.node}) ` +
        `ASSERT n.${rule.property} IS TYPED ${memgraphType}`
      )
    }

    // Value-shape rules and everything about edges are enforced by no backend we target.
    // They live in the write/read validators and in the audit queries. Spelled out rather
    // than defaulted so that a new rule kind has to be decided on here, not silently dropped.
    case 'pattern':
    case 'minLength':
    case 'minimum':
    case 'enum':
    case 'cardinality':
    case 'endpoints':
      return null
  }
}

/** Index DDL. Indexes are not rules — nothing is wrong with a database that lacks one. */
export const indexStatementsFor = (
  entity: EntityDefinition,
  profile: BackendProfile,
): { statements: string[]; unsupported: string[] } => {
  const neo4j = capabilitiesFor(profile).dialect === 'neo4j'
  const statements = (entity.indexed ?? []).map((property) =>
    neo4j
      ? `CREATE INDEX ${entity.label}_${property}_index IF NOT EXISTS FOR (n:${entity.label}) ON (n.${property})`
      : `CREATE INDEX ON :${entity.label}(${property})`,
  )
  const unsupported: string[] = []

  for (const index of entity.fulltext ?? []) {
    if (neo4j) {
      // Neo4j 4.4 spells fulltext indexes as a procedure call; CREATE FULLTEXT INDEX is 5.x.
      statements.push(
        `CALL db.index.fulltext.createNodeIndex(` +
          `"${index.name}",["${entity.label}"],[${index.properties.map((p) => `"${p}"`).join(',')}])`,
      )
    } else {
      // Memgraph has text indexes, but they are not the same object: no per-property list and
      // a different query surface. Reported rather than silently approximated.
      unsupported.push(
        `fulltext index ${index.name} on ${entity.label}(${index.properties.join(', ')})`,
      )
    }
  }

  return { statements, unsupported }
}
