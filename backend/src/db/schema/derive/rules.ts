import type {
  Cardinality,
  EntityDefinition,
  PropertySchema,
  PropertyType,
  RelationshipDefinition,
} from '@db/schema/types'

// Every rule a declaration makes, as data.
//
// This module exists so that "enforced by the database" and "checked by an audit query" are
// two views of ONE list rather than two hand-maintained ones. derive/ddl.ts turns the rules a
// backend can enforce into DDL; derive/audit.ts turns the remainder into Cypher. A rule that
// falls through both would be a rule nobody checks, which is exactly the state we are
// migrating away from — rules.spec.ts asserts the two partitions cover the whole list.

/**
 * What a property rule is about. Node properties and edge properties differ only in how the
 * pattern is matched — `MATCH (n:Label)` vs `MATCH ()-[n:TYPE]->()` — so both bind the same
 * alias and every predicate below is written once.
 */
export type Scope = { readonly node: string } | { readonly edge: string }

export const scopeLabel = (scope: Scope): string =>
  'node' in scope ? scope.node : `[:${scope.edge}]`

export type Rule =
  | { kind: 'unique'; label: string; properties: string[] }
  | { kind: 'exists'; scope: Scope; property: string }
  | { kind: 'dataType'; scope: Scope; property: string; types: PropertyType[] }
  | { kind: 'pattern'; scope: Scope; property: string; pattern: string }
  | { kind: 'minLength'; scope: Scope; property: string; minLength: number }
  | { kind: 'minimum'; scope: Scope; property: string; minimum: number }
  | { kind: 'enum'; scope: Scope; property: string; values: readonly unknown[] }
  | { kind: 'cardinality'; type: string; from: string[]; cardinality: Cardinality }
  | {
      kind: 'endpoints'
      type: string
      from: string[]
      to: string[]
      /**
       * Which source/target combinations are real. One branch means "every source with every
       * target", which is what `from` and `to` alone can say; more than one means the cross
       * product overstates it — see RelationshipEndpoints.
       */
      branches: { from: string[]; to: string[] }[]
    }

// `typeof` rather than Array.isArray: the latter widens a `readonly PropertyType[]` to
// `any[]`, which then infects every array built from it.
const typesOf = (type: PropertyType | readonly PropertyType[]): PropertyType[] =>
  typeof type === 'string' ? [type] : [...type]

/** The rules a property map makes, for either a node label or an edge type. */
const rulesForProperties = (
  scope: Scope,
  properties: Readonly<Record<string, PropertySchema>>,
  required: readonly string[],
): Rule[] => {
  const rules: Rule[] = required.map((property) => ({ kind: 'exists', scope, property }))

  for (const [property, schema] of Object.entries(properties)) {
    rules.push({ kind: 'dataType', scope, property, types: typesOf(schema.type) })
    if (schema.pattern !== undefined) {
      rules.push({ kind: 'pattern', scope, property, pattern: schema.pattern })
    }
    if (schema.minLength !== undefined) {
      rules.push({ kind: 'minLength', scope, property, minLength: schema.minLength })
    }
    if (schema.minimum !== undefined) {
      rules.push({ kind: 'minimum', scope, property, minimum: schema.minimum })
    }
    if (schema.enum !== undefined) {
      rules.push({ kind: 'enum', scope, property, values: schema.enum })
    }
  }

  return rules
}

export const rulesForEntity = (entity: EntityDefinition): Rule[] => [
  ...(entity.unique ?? []).map((key): Rule => ({
    kind: 'unique',
    label: entity.label,
    properties: typeof key === 'string' ? [key] : [...key],
  })),
  ...rulesForProperties({ node: entity.label }, entity.properties, entity.required),
]

const asList = (
  value: EntityDefinition | readonly EntityDefinition[],
): readonly EntityDefinition[] =>
  Array.isArray(value) ? (value as readonly EntityDefinition[]) : [value as EntityDefinition]

/** The permitted source entities of a relationship, always as a list. */
/**
 * The permitted ways to connect, always as a list of branches.
 *
 * The `from`/`to` form is one branch; `connects` is however many it declares. Everything below
 * reads THIS rather than the two fields, so a declaration written either way produces the same
 * rules and the shape stays a detail of the declaration.
 */
export const branchesOf = (
  relationship: RelationshipDefinition,
): readonly { from: readonly EntityDefinition[]; to: readonly EntityDefinition[] }[] =>
  relationship.connects
    ? relationship.connects.map((branch) => ({
        from: asList(branch.from),
        to: asList(branch.to),
      }))
    : [{ from: asList(relationship.from), to: asList(relationship.to) }]

/** Distinct entities, in declaration order — a label may appear in more than one branch. */
const distinct = (entities: readonly EntityDefinition[]): readonly EntityDefinition[] => [
  ...new Map(entities.map((entity) => [entity.label, entity])).values(),
]

export const sourcesOf = (relationship: RelationshipDefinition): readonly EntityDefinition[] =>
  distinct(branchesOf(relationship).flatMap((branch) => branch.from))

/** The permitted target entities of a relationship, always as a list. */
export const targetsOf = (relationship: RelationshipDefinition): readonly EntityDefinition[] =>
  distinct(branchesOf(relationship).flatMap((branch) => branch.to))

export const rulesForRelationship = (relationship: RelationshipDefinition): Rule[] => {
  const rules: Rule[] = [
    // Edge properties are declared just like node properties and were, until this was added,
    // the one part of a declaration that nothing looked at: no engine constrains edges, and
    // no rule was emitted for them either.
    ...rulesForProperties(
      { edge: relationship.type },
      relationship.properties ?? {},
      relationship.required ?? [],
    ),
    {
      kind: 'endpoints',
      type: relationship.type,
      from: sourcesOf(relationship).map((entity) => entity.label),
      to: targetsOf(relationship).map((entity) => entity.label),
      branches: branchesOf(relationship).map((branch) => ({
        from: branch.from.map((entity) => entity.label),
        to: branch.to.map((entity) => entity.label),
      })),
    },
  ]
  // `many` states no restriction, so it yields no rule. Emitting one would leave a rule that
  // neither ddl.ts nor audit.ts acts on, and the "every rule is enforced or audited"
  // invariant would have to carry an exception instead of holding.
  if (relationship.cardinality !== 'many') {
    rules.push({
      kind: 'cardinality',
      type: relationship.type,
      from: sourcesOf(relationship).map((entity) => entity.label),
      cardinality: relationship.cardinality,
    })
  }
  return rules
}

export const allRules = (
  entities: readonly EntityDefinition[],
  relationships: readonly RelationshipDefinition[],
): Rule[] => [...entities.flatMap(rulesForEntity), ...relationships.flatMap(rulesForRelationship)]
