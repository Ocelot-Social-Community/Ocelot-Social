import type {
  Cardinality,
  EntityDefinition,
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

export type Rule =
  | { kind: 'unique'; label: string; properties: string[] }
  | { kind: 'exists'; label: string; property: string }
  | { kind: 'dataType'; label: string; property: string; types: PropertyType[] }
  | { kind: 'pattern'; label: string; property: string; pattern: string }
  | { kind: 'minLength'; label: string; property: string; minLength: number }
  | { kind: 'minimum'; label: string; property: string; minimum: number }
  | { kind: 'enum'; label: string; property: string; values: readonly unknown[] }
  | { kind: 'cardinality'; type: string; from: string; cardinality: Cardinality }
  | { kind: 'endpoints'; type: string; from: string; to: string[] }

// `typeof` rather than Array.isArray: the latter widens a `readonly PropertyType[]` to
// `any[]`, which then infects every array built from it.
const typesOf = (type: PropertyType | readonly PropertyType[]): PropertyType[] =>
  typeof type === 'string' ? [type] : [...type]

export const rulesForEntity = (entity: EntityDefinition): Rule[] => {
  const rules: Rule[] = []

  for (const key of entity.unique ?? []) {
    rules.push({
      kind: 'unique',
      label: entity.label,
      properties: typeof key === 'string' ? [key] : [...key],
    })
  }

  for (const property of entity.required) {
    rules.push({ kind: 'exists', label: entity.label, property })
  }

  for (const [property, schema] of Object.entries(entity.properties)) {
    rules.push({
      kind: 'dataType',
      label: entity.label,
      property,
      types: typesOf(schema.type),
    })
    if (schema.pattern !== undefined) {
      rules.push({ kind: 'pattern', label: entity.label, property, pattern: schema.pattern })
    }
    if (schema.minLength !== undefined) {
      rules.push({ kind: 'minLength', label: entity.label, property, minLength: schema.minLength })
    }
    if (schema.minimum !== undefined) {
      rules.push({ kind: 'minimum', label: entity.label, property, minimum: schema.minimum })
    }
    if (schema.enum !== undefined) {
      rules.push({ kind: 'enum', label: entity.label, property, values: schema.enum })
    }
  }

  return rules
}

/** The permitted target entities of a relationship, always as a list. */
export const targetsOf = (relationship: RelationshipDefinition): readonly EntityDefinition[] =>
  Array.isArray(relationship.to)
    ? (relationship.to as readonly EntityDefinition[])
    : [relationship.to as EntityDefinition]

export const rulesForRelationship = (relationship: RelationshipDefinition): Rule[] => {
  const rules: Rule[] = [
    {
      kind: 'endpoints',
      type: relationship.type,
      from: relationship.from.label,
      to: targetsOf(relationship).map((entity) => entity.label),
    },
  ]
  // `many` states no restriction, so it yields no rule. Emitting one would leave a rule that
  // neither ddl.ts nor audit.ts acts on, and the "every rule is enforced or audited"
  // invariant would have to carry an exception instead of holding.
  if (relationship.cardinality !== 'many') {
    rules.push({
      kind: 'cardinality',
      type: relationship.type,
      from: relationship.from.label,
      cardinality: relationship.cardinality,
    })
  }
  return rules
}

export const allRules = (
  entities: readonly EntityDefinition[],
  relationships: readonly RelationshipDefinition[],
): Rule[] => [...entities.flatMap(rulesForEntity), ...relationships.flatMap(rulesForRelationship)]
