// The single source for what may live in the database.
//
// One entity declaration yields, without any of them being written a second time:
//   - the TS type of a node's properties (EntityProperties<typeof User>)
//   - the JSON Schema handed to ajv for write- and read-path validation
//   - the constraint/index DDL, per backend profile (see derive/ddl.ts)
//   - the audit queries for every rule the backend cannot enforce (see derive/audit.ts)
//
// The property map is JSON-Schema-SHAPED but flattened: `properties` + `required` sit
// side by side instead of nested under a `type: 'object'` wrapper. jsonSchemaFor() folds
// it back into real JSON Schema. The flat form is what makes `unique: ['slugg']` a compile
// error — a nested schema hides the property names behind an object literal that TypeScript
// can no longer relate to the sibling keys.

export type PropertyType = 'string' | 'boolean' | 'integer' | 'number' | 'null'

export interface PropertySchema {
  /** A list means a union; include 'null' for nullable properties. */
  readonly type: PropertyType | readonly PropertyType[]
  /** Java- AND JS-compatible regex only: it is used by ajv and by the audit Cypher. */
  readonly pattern?: string
  readonly minLength?: number
  readonly minimum?: number
  readonly enum?: readonly (string | number | boolean | null)[]
  readonly description?: string
}

export interface EntityDefinition {
  /** The primary label. Secondary labels (Post:Article) are declared via `alsoLabelled`. */
  readonly label: string
  /**
   * Additional labels nodes of this entity MAY carry. Declared so the drift check does not
   * report `(:Post:Article)` as an unknown label. `Post` carries `Article` today via
   * neode's `extend()` in db/neo4j.ts.
   */
  readonly alsoLabelled?: readonly string[]
  readonly properties: Readonly<Record<string, PropertySchema>>
  readonly required: readonly string[]
  /** Properties the DATABASE must enforce as unique. Nested arrays are composite keys. */
  readonly unique?: readonly (string | readonly string[])[]
  readonly indexed?: readonly string[]
  readonly fulltext?: readonly { readonly name: string; readonly properties: readonly string[] }[]
}

export type Cardinality =
  /** Every source node has exactly one such edge. Enforceable by no engine — audited. */
  'exactly-one' | 'at-most-one' | 'many'

export interface RelationshipDefinition {
  readonly type: string
  readonly from: EntityDefinition
  readonly to: EntityDefinition
  /** Seen from `from`. */
  readonly cardinality: Cardinality
  readonly properties?: Readonly<Record<string, PropertySchema>>
  readonly required?: readonly string[]
}

// ---------------------------------------------------------------------------
// Derivation: the TS type of a node's properties
// ---------------------------------------------------------------------------

type ScalarOf<T> = T extends 'string'
  ? string
  : T extends 'boolean'
    ? boolean
    : T extends 'integer' | 'number'
      ? number
      : T extends 'null'
        ? null
        : never

type ValueOf<P extends PropertySchema> = P extends { readonly enum: readonly (infer E)[] }
  ? E
  : P['type'] extends readonly (infer T)[]
    ? ScalarOf<T>
    : ScalarOf<P['type']>

type RequiredKey<E extends EntityDefinition> = E['required'][number] & keyof E['properties']
type OptionalKey<E extends EntityDefinition> = Exclude<keyof E['properties'], RequiredKey<E>>

/** The properties of one node, as they come back from the driver (after unwrap()). */
export type EntityProperties<E extends EntityDefinition> = {
  [K in RequiredKey<E>]: ValueOf<E['properties'][K]>
} & {
  [K in OptionalKey<E>]?: ValueOf<E['properties'][K]>
}

// ---------------------------------------------------------------------------
// Declaration helpers
// ---------------------------------------------------------------------------

/**
 * Declares an entity.
 *
 * The generic constraint is what ties the graph metadata to the property map: `unique`,
 * `indexed`, `required` and every fulltext property must name a declared property, or the
 * declaration does not compile. That check is the reason this indirection exists at all —
 * a plain object literal would accept `unique: ['slugg']`.
 */
export const defineEntity = <
  const E extends EntityDefinition & {
    required: readonly (keyof E['properties'])[]
    unique?: readonly (keyof E['properties'] | readonly (keyof E['properties'])[])[]
    indexed?: readonly (keyof E['properties'])[]
    fulltext?: readonly {
      name: string
      properties: readonly (keyof E['properties'])[]
    }[]
  },
>(
  entity: E,
): E => entity

export const defineRelationship = <
  const R extends RelationshipDefinition & {
    required?: readonly (keyof R['properties'])[]
  },
>(
  relationship: R,
): R => relationship

// ---------------------------------------------------------------------------
// Derivation: the JSON Schema for ajv
// ---------------------------------------------------------------------------

export interface JsonSchema {
  type: 'object'
  properties: Record<string, PropertySchema>
  required: string[]
  additionalProperties: false
}

/**
 * The JSON Schema for a node's properties.
 *
 * `additionalProperties: false` is deliberate and is the point of the whole exercise: an
 * undeclared property is a validation error rather than a silent extra column. Reads go
 * through the same schema as writes, so a property some migration added without declaring
 * it surfaces on the next read instead of never.
 */
export const jsonSchemaFor = (entity: EntityDefinition): JsonSchema => ({
  type: 'object',
  properties: { ...entity.properties },
  required: [...entity.required],
  additionalProperties: false,
})

/** The JSON Schema for an edge's properties. Edges without properties allow none. */
export const relationshipJsonSchemaFor = (relationship: RelationshipDefinition): JsonSchema => ({
  type: 'object',
  properties: { ...(relationship.properties ?? {}) },
  required: [...(relationship.required ?? [])],
  additionalProperties: false,
})
