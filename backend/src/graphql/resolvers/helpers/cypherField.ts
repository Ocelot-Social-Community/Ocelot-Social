/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-object-injection */
import type { Context } from '@src/context'

// Field resolvers for what used to be @cypher directives.
//
// The statements were taken over from the .gql files UNCHANGED. neo4j-graphql-js bound the
// current node to `this` before running them; this helper does the same by prefixing a
// MATCH, so moving them could not quietly alter their semantics. The same goes for
// `$cypherParams` (used by e.g. Room.roomName) and for field arguments such as
// Location.name(lang) — both are passed straight through as query parameters.
//
// The `parent[key] !== undefined` guard mirrors helpers/Resolver.ts: a root query that
// already projected the value hands it over with the parent, and the resolver passes it
// back untouched instead of asking again. It only queries when the value is missing — a
// subscription payload, or a parent that carries nothing but its id.

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

/**
 * Converts a Bolt value into something GraphQL can serialise.
 *
 * Integers are the reason this has to recurse. Bolt returns them as `{ low, high }`, and
 * graphql-js rejects that with "Int cannot represent non-integer value: { low: 2, high: 0 }".
 * neo4j-graphql-js converted them while translating; a hand-written `RETURN node { .* }`
 * does not, so any projection reaching a resolver must be walked — including the maps
 * nested inside it.
 */
export const unwrap = (value: unknown): unknown => {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map(unwrap)
  if (typeof value !== 'object') return value
  if (isNeo4jInteger(value)) return value.toNumber()
  // A node — a field resolver is expected to return its properties, not the wrapper.
  if (isNeo4jNode(value)) return unwrap(value.properties)
  if (value instanceof Date) return value
  // A projection map (`node { .*, extra: … }`): its values need the same treatment.
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, unwrap(nested)]),
  )
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
type FieldStatement =
  | string
  | {
      statement: string
      defaults?: Record<string, unknown>
      always?: boolean
      /**
       * Value to use when the statement yields nothing.
       *
       * REQUIRED for non-null fields whose data can legitimately be missing. GraphQL refuses
       * null there and propagates the error to the nearest nullable ancestor, which removes
       * the WHOLE parent object from the response — one deleted chat partner would blank the
       * room, one author-less message the message. An aggregate returns 0 on its own
       * (`RETURN count(...)` is an aggregation and always produces a row), so this is only
       * for the lookups: an unmatched MATCH produces no row at all.
       */
      fallback?: unknown
    }

const normalise = (spec: FieldStatement) =>
  typeof spec === 'string'
    ? { statement: spec, defaults: {}, always: false, fallback: undefined }
    : { defaults: {}, always: false, fallback: undefined, ...spec }

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
    const { statement, defaults, always, fallback } = normalise(spec)

    resolvers[key] = async (parent: any, params: any, context: Context) => {
      // `always` disables the pass-through for fields whose NAME collides with a node
      // property that means something else. Post.postType is a list derived from labels
      // while the node also carries a `postType` string; Location.name is localised while
      // the node's `name` is the raw one. Trusting the parent there yields the wrong type
      // or the wrong language — silently, since both look plausible.
      // The fallback applies here too: a parent can carry the key with a NULL value — a
      // projection that coalesced to nothing, or a constructed subscription payload — and
      // returning that unchanged would fail a non-null field exactly like an unresolved one.
      if (!always && typeof parent?.[key] !== 'undefined') return parent[key] ?? fallback ?? null
      if (!parent?.[idAttribute]) return null

      const args = { ...defaults, ...(params ?? {}) }

      // Batched per (type, field, arguments). The arguments belong in the key because they
      // go into the statement: Location.name(lang) must not answer a "ru" request from a
      // batch that ran with "en". Same arguments batch together, different ones do not.
      const loaderKey = `${type}.${key}:${JSON.stringify(args)}`

      return context.loaders
        .forField(loaderKey, async (ids) => {
          const session = context.driver.session()
          try {
            return await session.readTransaction(async (transaction) => {
              // The statement runs unchanged inside a CALL subquery, with only `this` bound.
              // That avoids parsing or rewriting its body — the statements come from the old
              // @cypher directives and range from `RETURN this.id` to multi-clause queries
              // with WITH/ORDER BY/LIMIT.
              const result = await transaction.run(
                `
                UNWIND $ids AS __id
                CALL {
                  WITH __id
                  MATCH (this:${type} { ${idAttribute}: __id })
                  ${statement} AS __value
                }
                RETURN __id AS __id, __value AS __value
              `,
                { ...args, ids, cypherParams: context.cypherParams ?? {} },
              )
              const byId = new Map<unknown, unknown>()
              for (const record of result.records)
                byId.set(record.get('__id'), record.get('__value'))
              // An id with no row is a legitimate empty answer — what the directive produced
              // too — but DataLoader still needs one entry per key, in key order.
              return ids.map((id) => {
                const value = byId.has(id) ? unwrap(byId.get(id)) : null
                return value ?? fallback ?? null
              })
            })
          } finally {
            await session.close()
          }
        })
        .load(parent[idAttribute] as string)
    }
  }

  return resolvers
}

/**
 * `_id` used to be generated by neo4j-graphql-js on every type. The chat frontend depends
 * on it — vue-advanced-chat keys rooms and messages by `_id`, and Chat.vue matches a
 * message's sender against `users[]._id` — where it holds the BUSINESS id, not Neo4j's
 * internal node id.
 *
 * Removing the library would have taken the field with it, so it survives as an explicit,
 * deprecated field on Room, Message and User (see their .gql files) with this resolver
 * behind it. Retire both once the webapp selects `id` instead.
 */
export const underscoreIdResolver = {
  _id: (parent: { _id?: string; id?: string }) => parent._id ?? parent.id ?? null,
}
