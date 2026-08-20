import { Kind } from 'graphql'

import typeDefs from '@graphql/types/index'

import type {
  DefinitionNode,
  DocumentNode,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql'

// Reads the .gql type definitions and reports which fields are resolved by
// neo4j-graphql-js directives (@cypher / @relation) rather than by our own resolvers.
//
// This is the completeness anchor for the migration away from neo4j-graphql-js: those
// directives only resolve inside a Cypher translation started by neo4jgraphql() at a
// root field. Replacing them with real field resolvers is a mechanical change across
// ~80 fields, and the failure mode is silent (a field stops being populated). The SDL
// snapshot test cannot see it — printSchema() prints directive *definitions*, not their
// *application* — so the field-resolution tests derive their metadata from here instead
// of from a hand-maintained list that would drift.

export interface DirectiveField {
  /** Field name as it appears in the .gql file. */
  name: string
  /** Printed GraphQL type, e.g. `Int!` or `[User]`. */
  type: string
  /** Type name with list/non-null wrappers stripped, e.g. `User`. */
  namedType: string
  /** True when the field resolves to an object type and therefore needs a sub-selection. */
  isObject: boolean
  /** Which directives carry the resolution: `cypher`, `relation`, or both. */
  directives: string[]
  /** Arguments the field accepts (`first`, `orderBy`, …). */
  argumentNames: string[]
  /**
   * Arguments that are non-null WITHOUT a default, i.e. a selection of this field is
   * invalid unless the test supplies them. Surfacing these makes the generated queries
   * fail loudly at build time rather than silently skipping the field.
   */
  requiredArgumentNames: string[]
}

const RESOLUTION_DIRECTIVES = ['cypher', 'relation']

const isObjectTypeDefinition = (
  definition: DefinitionNode,
): definition is ObjectTypeDefinitionNode => definition.kind === Kind.OBJECT_TYPE_DEFINITION

const printType = (type: TypeNode): string => {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return `${printType(type.type)}!`
  }
  if (type.kind === Kind.LIST_TYPE) {
    return `[${printType(type.type)}]`
  }
  return type.name.value
}

const namedTypeOf = (type: TypeNode): string =>
  type.kind === Kind.NAMED_TYPE ? type.name.value : namedTypeOf(type.type)

const hasNoRequiredArguments = (field: FieldDefinitionNode): boolean =>
  (field.arguments ?? []).every(
    (argument) => argument.type.kind !== Kind.NON_NULL_TYPE || argument.defaultValue !== undefined,
  )

const objectTypeNamesOf = (document: DocumentNode): Set<string> =>
  new Set(document.definitions.filter(isObjectTypeDefinition).map((d) => d.name.value))

const toDirectiveField = (
  field: FieldDefinitionNode,
  objectTypeNames: Set<string>,
): DirectiveField => ({
  name: field.name.value,
  type: printType(field.type),
  namedType: namedTypeOf(field.type),
  isObject: objectTypeNames.has(namedTypeOf(field.type)),
  directives: (field.directives ?? [])
    .map((directive) => directive.name.value)
    .filter((name) => RESOLUTION_DIRECTIVES.includes(name)),
  argumentNames: (field.arguments ?? []).map((argument) => argument.name.value),
  requiredArgumentNames: (field.arguments ?? [])
    .filter(
      (argument) =>
        argument.type.kind === Kind.NON_NULL_TYPE && argument.defaultValue === undefined,
    )
    .map((argument) => argument.name.value),
})

/**
 * All object types that own at least one @cypher/@relation field, keyed by type name.
 * Types without such fields are omitted entirely.
 */
export const directiveInventory = (
  document: DocumentNode = typeDefs,
): Record<string, DirectiveField[]> => {
  const objectTypeNames = objectTypeNamesOf(document)
  const inventory: Record<string, DirectiveField[]> = {}

  for (const definition of document.definitions) {
    if (!isObjectTypeDefinition(definition)) {
      continue
    }

    const fields = (definition.fields ?? [])
      .map((field) => toDirectiveField(field, objectTypeNames))
      .filter((field) => field.directives.length > 0)

    if (fields.length > 0) {
      inventory[definition.name.value] = fields
    }
  }

  return inventory
}

/**
 * Metadata for a specific field, regardless of whether it still carries a directive.
 *
 * This is what lets the field-resolution tests keep testing a field AFTER its @cypher /
 * @relation directive has been replaced by a real resolver. Deriving the work list from
 * the directives alone would delete the test together with the directive — the migration
 * would silently lose its own safety net.
 *
 * Returns undefined when the field no longer exists at all (a genuine schema change).
 */
export const fieldMetadata = (
  typeName: string,
  fieldName: string,
  document: DocumentNode = typeDefs,
): DirectiveField | undefined => {
  const definition = document.definitions
    .filter(isObjectTypeDefinition)
    .find((d) => d.name.value === typeName)
  const field = definition?.fields?.find((f) => f.name.value === fieldName)

  return field ? toDirectiveField(field, objectTypeNamesOf(document)) : undefined
}

/**
 * A scalar field usable as the sub-selection when probing an object-typed field, keyed by
 * type name. `id` where it exists, otherwise the first argument-free scalar field.
 *
 * Why not `__typename`: neo4j-graphql-js cannot translate a selection set that contains
 * only meta-fields — it throws "Cannot read properties of undefined (reading 'name')"
 * while building the Cypher projection. A real scalar field keeps the probe honest anyway,
 * since it forces the related node to actually be fetched.
 */
export const representativeScalarFields = (
  document: DocumentNode = typeDefs,
): Record<string, string> => {
  const objectTypeNames = objectTypeNamesOf(document)
  const representatives: Record<string, string> = {}

  for (const definition of document.definitions) {
    if (!isObjectTypeDefinition(definition)) {
      continue
    }

    const scalarFields = (definition.fields ?? []).filter(
      (field) => !objectTypeNames.has(namedTypeOf(field.type)) && hasNoRequiredArguments(field),
    )

    const chosen = scalarFields.find((field) => field.name.value === 'id') ?? scalarFields[0]
    if (chosen) {
      representatives[definition.name.value] = chosen.name.value
    }
  }

  return representatives
}
