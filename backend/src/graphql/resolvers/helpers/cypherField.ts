/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-object-injection */
import type { Context } from '@src/context'

// Field resolvers for what used to be @cypher directives.
//
// The statements are taken from the .gql files UNCHANGED. neo4j-graphql-js binds the
// current node to `this` before running them; this helper does the same by prefixing a
// MATCH, so the migration cannot quietly alter a query's semantics while moving it. The
// same goes for `$cypherParams` (used by e.g. Room.roomName) and for field arguments such
// as Location.name(lang) — both are passed straight through as query parameters.
//
// The `parent[key] !== undefined` guard mirrors helpers/Resolver.ts: while neo4j-graphql-js
// still translates a root query it delivers these values with the parent, and the resolver
// hands them back untouched. It only queries when the value is missing — a subscription
// payload, a hand-written root resolver, and eventually every parent.

interface Neo4jInteger {
  toNumber: () => number
}
interface Neo4jNode {
  properties: Record<string, unknown>
  labels: string[]
}

const isNeo4jInteger = (value: object): value is Neo4jInteger =>
  'toNumber' in value && typeof (value as Neo4jInteger).toNumber === 'function'

const isNeo4jNode = (value: object): value is Neo4jNode =>
  'properties' in value && 'labels' in value

/** Bolt integers and nodes need unwrapping; everything else passes through. */
const unwrap = (value: unknown): unknown => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map(unwrap)
  if (typeof value !== 'object') return value
  if (isNeo4jInteger(value)) return value.toNumber()
  // A node — a field resolver is expected to return its properties, not the wrapper.
  if (isNeo4jNode(value)) return value.properties
  return value
}

interface CypherFieldOptions {
  /** Property used to match the parent node. Defaults to `id`. */
  idAttribute?: string
}

/**
 * A statement, optionally with defaults for the field arguments it references.
 *
 * Defaults are REQUIRED for any argument the statement uses: Cypher rejects a query whose
 * parameter is missing ("Expected parameter(s): lang"), and a resolver is not always called
 * through GraphQL — a subscription payload or another resolver passes no arguments at all,
 * so the schema's own default never gets applied. Mirror the SDL default here.
 */
type FieldStatement = string | { statement: string; defaults: Record<string, unknown> }

const normalise = (spec: FieldStatement) =>
  typeof spec === 'string' ? { statement: spec, defaults: {} } : spec

/**
 * Builds field resolvers from `{ fieldName: cypherStatement }`, where the statement is the
 * body of the former @cypher directive.
 *
 * @example
 * ...cypherFields('Room', {
 *   roomId: 'RETURN this.id',
 * })
 */
export default function cypherFields(
  type: string,
  statements: Record<string, FieldStatement>,
  { idAttribute = 'id' }: CypherFieldOptions = {},
) {
  const resolvers: Record<string, unknown> = {}

  for (const [key, spec] of Object.entries(statements)) {
    const { statement, defaults } = normalise(spec)

    resolvers[key] = async (parent: any, params: any, context: Context) => {
      if (typeof parent?.[key] !== 'undefined') return parent[key]
      if (!parent?.[idAttribute]) return null

      const session = context.driver.session()
      try {
        return await session.readTransaction(async (transaction) => {
          const result = await transaction.run(
            `MATCH (this:${type} { ${idAttribute}: $id })\n${statement}`,
            {
              // Defaults first, then the actual arguments; `id` and `cypherParams` are ours
              // and must win a name clash.
              ...defaults,
              ...(params ?? {}),
              id: parent[idAttribute],
              cypherParams: context.cypherParams ?? {},
            },
          )
          const record = result.records[0]
          // No row at all (e.g. an unmatched MATCH) is a legitimate empty answer; this is
          // also what the directive produced.
          return record ? unwrap(record.get(0)) : null
        })
      } finally {
        await session.close()
      }
    }
  }

  return resolvers
}
