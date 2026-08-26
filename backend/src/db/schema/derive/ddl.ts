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
  /**
   * A fulltext index over named properties, as `entity.fulltext` declares it.
   *
   * A capability rather than a `dialect === 'neo4j'` test at the two places that ask, because
   * both of them have to answer identically: indexStatementsFor() decides whether to emit the
   * statement, and declaredObjects() (drift.ts) decides whether the index is something this
   * profile wants at all. When those two disagreed, the drift report listed the same index as
   * MISSING and as UNSUPPORTED, and `check` could never reach "in sync".
   */
  readonly fulltext: boolean
  readonly dialect: 'neo4j' | 'memgraph'
}

// A Map rather than a Record: the profile is looked up by a runtime value, and an object
// index with a variable key is exactly the pattern the security lint flags.
export const CAPABILITIES = new Map<BackendProfile, Capabilities>([
  // Neo4j 4.4 Community: uniqueness and indexes, nothing else. Composite uniqueness exists
  // only as NODE KEY, which is an Enterprise feature.
  [
    'neo4j-community',
    {
      unique: true,
      compositeUnique: false,
      existence: false,
      dataType: false,
      fulltext: true,
      dialect: 'neo4j',
    },
  ],
  // Neo4j 4.4 Enterprise: adds existence constraints and NODE KEY. Type constraints did not
  // arrive before Neo4j 5.9, so they stay unenforced here too.
  [
    'neo4j-enterprise',
    {
      unique: true,
      compositeUnique: true,
      existence: true,
      dataType: false,
      fulltext: true,
      dialect: 'neo4j',
    },
  ],
  // Memgraph's free edition carries all three constraint classes, including native composite
  // uniqueness and IS TYPED. This is the profile that enforces the most of our declaration —
  // relevant for the paused Memgraph migration. Fulltext is the one thing it does NOT have in
  // this shape: it offers text indexes, which are a different object (see indexStatementsFor).
  [
    'memgraph',
    {
      unique: true,
      compositeUnique: true,
      existence: true,
      dataType: true,
      fulltext: false,
      dialect: 'memgraph',
    },
  ],
])

export const capabilitiesFor = (profile: BackendProfile): Capabilities => {
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

/**
 * Our property types as Memgraph's `IS TYPED` names.
 *
 * `number` is deliberately ABSENT. JSON Schema's `number` is "integer or float", and Memgraph
 * keeps the two strictly apart — there is no `IS TYPED` that spells the union. Mapping it to
 * FLOAT looked harmless and was not: a constraint silences the audit for that rule
 * (`auditFor`), so the value 1 stored in a `number` property would have violated a constraint
 * the declaration permits, with nothing left to say otherwise. Seven properties are declared
 * that way — Location.lat/lng, Migration.timestamp, Donations.goal/progress, Image.aspectRatio,
 * File.duration — and a millisecond timestamp is an INTEGER in practice, so this would have
 * failed on the first real Memgraph deployment rather than in a corner case.
 *
 * Absent means audited: audit.ts asks `NOT type IN ['INTEGER', 'FLOAT']`, which is the
 * question the declaration actually poses. A type the backend cannot express is not a type we
 * stop checking.
 */
const MEMGRAPH_TYPE = new Map<PropertyType, string>([
  ['string', 'STRING'],
  ['boolean', 'BOOLEAN'],
  ['integer', 'INTEGER'],
])

/**
 * The DDL statement enforcing this rule, or null if the profile cannot enforce it.
 *
 * Returning null rather than throwing is what makes the audit complement work: audit.ts asks
 * the same question and takes everything this returns null for.
 */
// UNVERIFIED on Memgraph: idempotency.
//
// Every Neo4j statement below carries `IF NOT EXISTS`, so `apply` can run on every deployment
// and a second run is a no-op. Memgraph's constraint grammar is the pre-4.4 spelling
// (`CREATE CONSTRAINT ON ... ASSERT ...`) and has no such clause, so re-creating an existing
// constraint is answered by the server rather than by the statement — and applyPlan()
// recognises exactly one "already there" answer, Neo4j's EquivalentSchemaRuleAlreadyExists.
// If Memgraph errors instead of shrugging, a second `apply memgraph` lands in `failed`, which
// `enforce` turns into a thrown error in BOTH enforcement modes, production included.
//
// Not fixed here because it cannot be verified here: no Memgraph runs in this project (the
// profile exists for `check memgraph`, which never executes DDL — see run-audit.ts), so any
// remedy would be written blind. The two candidates, in order of preference once a server is
// available to measure against: ask `SHOW CONSTRAINT INFO` before creating, which depends on
// no error text at all; or teach `isAlreadySatisfied` the message Memgraph actually returns.
// Guessing that string now would look like coverage and be none.
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
  const capabilities = capabilitiesFor(profile)
  const neo4j = capabilities.dialect === 'neo4j'
  const statements = (entity.indexed ?? []).map((property) =>
    neo4j
      ? `CREATE INDEX ${entity.label}_${property}_index IF NOT EXISTS FOR (n:${entity.label}) ON (n.${property})`
      : `CREATE INDEX ON :${entity.label}(${property})`,
  )
  const unsupported: string[] = []

  for (const index of entity.fulltext ?? []) {
    if (capabilities.fulltext) {
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
