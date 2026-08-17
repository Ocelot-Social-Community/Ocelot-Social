import { Kind } from 'graphql'

import { UserInputError } from '@graphql/errors'
import typeDefs from '@graphql/types/index'

// Turns an `orderBy` argument into a Cypher ORDER BY clause.
//
// The allowed fields are READ FROM THE `_*Ordering` ENUM rather than repeated in the
// resolver. Hand-maintained copies drifted in both directions and neither direction was
// visible: `_PostOrdering` offered `language_asc` that the resolver rejected as unsupported,
// `_UserOrdering` offered `about`, `locale` and `locationName` likewise — while the
// resolvers additionally accepted seven values the schema never advertised.
//
// Field names are interpolated into Cypher, so they must never come from request data. They
// do not: they come from our own SDL, and anything not in it is rejected.

const orderingFields = (enumName: string): Set<string> => {
  for (const definition of typeDefs.definitions) {
    if (definition.kind !== Kind.ENUM_TYPE_DEFINITION) continue
    if (definition.name.value !== enumName) continue
    return new Set(
      (definition.values ?? []).map((value) => value.name.value.replace(/_(asc|desc)$/, '')),
    )
  }
  throw new Error(`Ordering enum ${enumName} not found in the schema.`)
}

interface OrderingOptions {
  /** The `_*Ordering` enum that defines what callers may ask for. */
  enumName: string
  /** Cypher variable the properties belong to. */
  alias: string
  /** ORDER BY used when the caller passes nothing. */
  fallback: string
  /**
   * Fields that are NOT stored properties, mapped to the expression that computes them.
   *
   * Without this a derived field sorts by a property that does not exist: Cypher returns
   * null for every row, so the ordering silently does nothing. `_TagOrdering` advertises
   * taggedCount and taggedCountUnique, `_CategoryOrdering` advertises postCount — none of
   * them are on the node.
   */
  computed?: Record<string, string>
}

export const orderClause = (orderBy: unknown, options: OrderingOptions): string => {
  const { enumName, alias, fallback, computed = {} } = options
  const allowed = orderingFields(enumName)

  const entries = orderBy == null ? [] : Array.isArray(orderBy) ? orderBy : [orderBy]
  const clauses = entries.map((entry) => {
    const raw = String(entry)
    const direction = raw.endsWith('_desc') ? 'DESC' : 'ASC'
    const field = raw.replace(/_(asc|desc)$/, '')
    if (!allowed.has(field)) {
      throw new UserInputError(`Unsupported orderBy '${raw}'.`)
    }
    // eslint-disable-next-line security/detect-object-injection -- key checked against the SDL enum
    const expression = computed[field] ?? `${alias}.${field}`
    return `${expression} ${direction}`
  })

  return clauses.length > 0 ? clauses.join(', ') : fallback
}
