import { capabilitiesFor, CAPABILITIES, indexStatementsFor, statementFor } from './ddl'
import { rulesForEntity } from './rules'

import type { BackendProfile } from './ddl'
import type { EntityDefinition } from '@db/schema/types'

// What the declaration wants versus what the database has — in BOTH directions.
//
// The second direction is new and matters because of what P2 removes. Until now every
// migration init ran `apoc.schema.assert({},{},true)`, which drops every constraint and index
// before reinstalling: whatever was no longer declared simply vanished. Converging with
// `CREATE ... IF NOT EXISTS` never removes anything, so a constraint that outlives its
// declaration stays forever and silently keeps rejecting writes nobody expects it to reject.
//
// Removal stays MANUAL. This module reports; it does not drop. An automatic drop would turn a
// typo in a declaration into data-availability loss on the next deployment.

/**
 * One schema object, identified by what it IS and not merely by where it sits.
 *
 * `kind` distinguishes the two constraint classes rather than lumping them as "constraint".
 * They share a label and a property list — `User.id` is both unique and required — so one
 * shared name collapsed them onto a single key, with two consequences. The wanted set held the
 * object twice, so a missing one printed twice and counted twice towards the exit code. Worse,
 * a database holding only the uniqueness constraint answered for the existence constraint as
 * well: the missing one was reported as present and never mentioned again. A drift check that
 * files a missing constraint as present is worse than none, because it claims assurance.
 *
 * Not visible on neo4j-community, where `existence: false` means no existence constraint is
 * ever wanted. It appears the moment the profile becomes enterprise or memgraph.
 *
 * The two INDEX kinds are separated for the same reason, one step ahead of the same bug. A
 * plain index and a fulltext index are different objects — different DDL, different capability,
 * `SHOW INDEXES` reports them as BTREE and FULLTEXT — and nothing stops an entity declaring
 * both over one property. None does today; the day one does, a single name would let a present
 * fulltext index answer for a missing plain one, and `unique()` would quietly drop one of the
 * two from the wanted side as a duplicate.
 */
export interface SchemaObject {
  readonly kind: 'unique' | 'exists' | 'index' | 'fulltext'
  readonly label: string
  readonly properties: readonly string[]
}

const key = (object: SchemaObject): string =>
  `${object.kind}:${object.label}(${[...object.properties].join(',')})`

/** The same objects with duplicates removed, first occurrence kept. */
const unique = (objects: readonly SchemaObject[]): SchemaObject[] => [
  ...new Map(objects.map((object) => [key(object), object])).values(),
]

/** Everything the declaration wants the database to hold, for one backend profile. */
export const declaredObjects = (
  entities: readonly EntityDefinition[],
  profile: BackendProfile,
): SchemaObject[] => {
  const objects: SchemaObject[] = []

  for (const entity of entities) {
    for (const rule of rulesForEntity(entity)) {
      if (statementFor(rule, profile) === null) {
        continue
      }
      if (rule.kind === 'unique') {
        objects.push({ kind: 'unique', label: rule.label, properties: rule.properties })
      } else if (rule.kind === 'exists' && 'node' in rule.scope) {
        objects.push({ kind: 'exists', label: rule.scope.node, properties: [rule.property] })
      }
      // Type constraints (memgraph) are left out — no longer because they would collide with
      // the existence constraint, which `kind` now prevents, but because nothing can read them
      // back. The present-side reader speaks `SHOW CONSTRAINTS`, which is Neo4j's; Memgraph
      // lists its constraints in another shape entirely. Declaring them wanted would make every
      // one of them MISSING on the documented "check memgraph against the running Neo4j"
      // preview run. They stay in the apply report.
    }
    // Plain indexes need no capability test: every profile can express one, only the spelling
    // differs (see indexStatementsFor).
    for (const property of entity.indexed ?? []) {
      objects.push({ kind: 'index', label: entity.label, properties: [property] })
    }
    // A fulltext index only counts as declared where the profile can create it. Otherwise the
    // comparison would want an object that `apply` reports as UNSUPPORTED in the same run:
    // the drift report listed it as MISSING and as UNSUPPORTED at once, and since `missing`
    // feeds the exit code, `check memgraph` could never come back clean. Which profiles can
    // is decided once, in the capability table.
    if (capabilitiesFor(profile).fulltext) {
      for (const index of entity.fulltext ?? []) {
        objects.push({ kind: 'fulltext', label: entity.label, properties: index.properties })
      }
    }
  }

  return objects
}

/**
 * Objects the declaration names and this profile cannot create.
 *
 * The counterpart to leaving them out of `declaredObjects`: excluding them from the WANTED
 * side alone only moves the double report, it does not remove it. Against a database that
 * holds such an object — `check memgraph` against the running Neo4j, which is the documented
 * "what would break after the migration" run — it would come back as SURPLUS "declared
 * nowhere", which is both untrue and an invitation to drop an index Neo4j should keep. The
 * honest report says UNSUPPORTED once, and nothing else.
 */
export const inexpressibleObjects = (
  entities: readonly EntityDefinition[],
  profile: BackendProfile,
): SchemaObject[] => {
  if (capabilitiesFor(profile).fulltext) {
    return []
  }
  return entities.flatMap((entity) =>
    (entity.fulltext ?? []).map((index): SchemaObject => ({
      kind: 'fulltext',
      label: entity.label,
      properties: index.properties,
    })),
  )
}

export interface DriftReport {
  /** Declared, but not present in the database. */
  readonly missing: SchemaObject[]
  /** Present in the database, but no longer declared. Reported, never dropped automatically. */
  readonly surplus: SchemaObject[]
}

/**
 * Compares the two sets.
 *
 * Constraint-backed indexes are excluded from `surplus` by the caller: Neo4j reports the
 * index that backs a uniqueness constraint in `SHOW INDEXES` as well, and reporting it as an
 * unwanted index would be noise for something that cannot exist independently.
 */
export const compareSchemaObjects = (
  declared: readonly SchemaObject[],
  present: readonly SchemaObject[],
): DriftReport => {
  const declaredKeys = new Set(declared.map(key))
  const presentKeys = new Set(present.map(key))
  // Both sides are SETS of objects, so each answer is given once. Filtering the arrays let a
  // duplicate through twice — printed twice and counted twice towards the exit code — which is
  // how the collapsed constraint kinds first showed themselves.
  return {
    missing: unique(declared).filter((object) => !presentKeys.has(key(object))),
    surplus: unique(present).filter((object) => !declaredKeys.has(key(object))),
  }
}

// The operator-facing name of each kind. `unique` and `exists` are how the code tells them
// apart; a drift report is read by someone deciding whether to create or drop something, and
// "unique User(id)" alone does not say what the object is.
const NAMES: Record<SchemaObject['kind'], string> = {
  unique: 'unique constraint',
  exists: 'existence constraint',
  index: 'index',
  fulltext: 'fulltext index',
}

/** Human-readable one-liner, used by the CLI and by the failure messages. */
export const describeSchemaObject = (object: SchemaObject): string =>
  `${NAMES[object.kind]} ${object.label}(${[...object.properties].join(', ')})`

/** Index statements for every entity, plus whatever the profile cannot express. */
export const declaredIndexStatements = (
  entities: readonly EntityDefinition[],
  profile: BackendProfile,
): { statements: string[]; unsupported: string[] } => {
  const statements: string[] = []
  const unsupported: string[] = []
  for (const entity of entities) {
    const result = indexStatementsFor(entity, profile)
    statements.push(...result.statements)
    unsupported.push(...result.unsupported)
  }
  return { statements, unsupported }
}

export const isKnownProfile = (profile: string): profile is BackendProfile =>
  CAPABILITIES.has(profile as BackendProfile)
