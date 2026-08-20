/* eslint-disable @typescript-eslint/no-dynamic-delete */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable security/detect-object-injection */
import { runBatch } from './batch'
import { unwrap } from './cypherField'

// ---------------------------------------------------------------------------------------
// Batch loaders behind the Resolver() factory.
//
// The generated statements are the single-row ones with the parent bound through UNWIND
// instead of a literal parameter, so the semantics are unchanged — only the number of round
// trips is. Two details matter:
//
//   * OPTIONAL MATCH, not MATCH: a plain MATCH drops parents with no related node, and the
//     result would then be shorter than the key list. DataLoader requires one entry per key
//     in key order, so every id has to survive the query.
//   * The `connection` fragments may carry their own WHERE (see the count configs). Appended
//     to an OPTIONAL MATCH that WHERE stays part of it, which is what the single-row version
//     did too.
// ---------------------------------------------------------------------------------------

const batchRelated = async ({ context, type, idAttribute, connection, ids }) => {
  const { byId } = await runBatch({
    context,
    ids,
    cypher: `
      UNWIND $ids AS __id
      MATCH (parent:${type} { ${idAttribute}: __id })
      OPTIONAL MATCH (parent)${connection}
      RETURN __id AS __id, collect(related {.*}) AS __value
    `,
  })
  // collect() skips nulls, so a parent with no match yields [] rather than [null].
  return ids.map((id) => unwrap(byId.get(id) ?? []))
}

const batchCount = async ({ context, type, idAttribute, connection, ids }) => {
  const { byId } = await runBatch({
    context,
    ids,
    cypher: `
      UNWIND $ids AS __id
      MATCH (parent:${type} { ${idAttribute}: __id })
      OPTIONAL MATCH (parent)${connection}
      RETURN __id AS __id, COUNT(DISTINCT related) AS __value
    `,
  })
  // unwrap() rather than an ad-hoc toNumber check: COUNT comes back as a Bolt integer
  // (`{low, high}`), which graphql-js refuses to serialise as Int. The typed runBatch made
  // this visible — the hand-rolled duck-typing passed only because the value was `any`.
  return ids.map((id) => unwrap(byId.get(id)) ?? 0)
}

const batchBoolean = async ({ context, type, idAttribute, condition, key, ids }) => {
  // The condition is a complete `MATCH (this)… RETURN <expr>` statement, run unchanged inside
  // a CALL subquery with only `this` bound — the same approach as helpers/cypherField.ts.
  //
  // `this` is bound by a PRECEDING match, not by editing the condition. Substituting into it
  // (`condition.replace('this', 'this { id: __id }')`) produced a pattern with neither label
  // nor idAttribute, and the label is what makes this affordable: for a condition that offers
  // no other indexed anchor — `MATCH (this) RETURN EXISTS(…)`, as Group.isMutedByMe and
  // Comment.shoutedByCurrentUser are written — the planner answered with an AllNodesScan of
  // the entire database per request, against a NodeUniqueIndexSeek once the label is there.
  // It was also wrong on its own terms: any node of any type sharing the id could match, and
  // a condition beginning `MATCH (this:User)` would have been rewritten into invalid Cypher.
  const { byId } = await runBatch({
    context,
    ids,
    cypher: `
      UNWIND $ids AS __id
      CALL {
        WITH __id
        MATCH (this:${type} { ${idAttribute}: __id })
        ${condition} AS ${key}
      }
      RETURN __id AS __id, ${key} AS __value
    `,
  })
  return ids.map((id) => byId.get(id) ?? false)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Resolver(type, options: any = {}) {
  const { idAttribute = 'id', boolean = {}, count = {}, hasOne = {}, hasMany = {} } = options

  const _hasResolver = (_resolvers, { key, connection }, { returnType }) => {
    return async (parent, _params, context, _resolveInfo) => {
      if (typeof parent[key] !== 'undefined') {
        return parent[key]
      }
      const id = parent[idAttribute]
      if (id === undefined || id === null) {
        return returnType === 'object' ? null : []
      }

      // Batched across every parent of this field in the current request: one statement
      // for a whole list instead of one per row (see context/loaders.ts).
      const rows = (await context.loaders
        .forField(`${type}.${key}`, async (ids) =>
          batchRelated({ context, type, idAttribute, connection, ids }),
        )
        .load(id)) as unknown[]

      return returnType === 'object' ? (rows[0] ?? null) : rows
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booleanResolver = (obj: any[]) => {
    const resolvers = {}
    for (const [key, condition] of Object.entries(obj)) {
      resolvers[key] = async (parent, _params, context, _resolveInfo) => {
        if (typeof parent[key] !== 'undefined') {
          return parent[key]
        }
        const id = parent[idAttribute]
        if (id === undefined || id === null) {
          return false
        }

        return context.loaders
          .forField(`${type}.${key}`, async (ids) =>
            batchBoolean({ context, type, idAttribute, condition, key, ids }),
          )
          .load(id)
      }
    }
    return resolvers
  }

  const countResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = async (parent, _params, context, _resolveInfo) => {
        if (typeof parent[key] !== 'undefined') {
          return parent[key]
        }
        const id = parent[idAttribute]
        if (id === undefined || id === null) {
          return 0
        }

        return context.loaders
          .forField(`${type}.${key}`, async (ids) =>
            batchCount({ context, type, idAttribute, connection, ids }),
          )
          .load(id)
      }
    }
    return resolvers
  }

  const hasManyResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = _hasResolver(resolvers, { key, connection }, { returnType: 'iterable' })
    }
    return resolvers
  }

  const hasOneResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = _hasResolver(resolvers, { key, connection }, { returnType: 'object' })
    }
    return resolvers
  }

  const result = {
    ...booleanResolver(boolean),
    ...countResolver(count),
    ...hasOneResolver(hasOne),
    ...hasManyResolver(hasMany),
  }
  return result
}

export const removeUndefinedNullValuesFromObject = (obj) => {
  Object.keys(obj).forEach((key) => {
    if ([undefined, null].includes(obj[key])) {
      delete obj[key]
    }
  })
}

export const convertObjectToCypherMapLiteral = (params, addSpaceInfrontIfMapIsNotEmpty = false) => {
  // I have found no other way yet. maybe "apoc.convert.fromJsonMap(key)" can help, but couldn't get it how, see: https://stackoverflow.com/questions/43217823/neo4j-cypher-inline-conversion-of-string-to-a-map
  // result looks like: '{id: "g0", slug: "yoga"}'
  const paramsEntries = Object.entries(params)
  let mapLiteral = ''
  paramsEntries.forEach((ele, index) => {
    mapLiteral += index === 0 ? '{' : ''
    mapLiteral += `${ele[0]}: "${ele[1]}"`
    mapLiteral += index < paramsEntries.length - 1 ? ', ' : '}'
  })
  mapLiteral = (addSpaceInfrontIfMapIsNotEmpty && mapLiteral.length > 0 ? ' ' : '') + mapLiteral
  return mapLiteral
}
