/* eslint-disable security/detect-object-injection */
import { UserInputError } from '@graphql/errors'

import { unwrap } from './cypherField'
import { orderClause } from './ordering'

import type { Context } from '@src/context'

// A root query over one node label: equality arguments, ordering, paging.
//
// Covers the last three queries neo4j-graphql-js still generated for us — Category, Tag and
// Comment (migration stage D). They have no bespoke logic: the filters they advertise are
// almost entirely unused, so reproducing the generated behaviour means matching scalars,
// ordering and slicing. Post and User keep their own resolvers because their filters carry
// visibility rules.
//
// Anything the caller passes that this does not implement is REJECTED. The schema advertises
// large generated `_*Filter` inputs, and silently ignoring one of their operators would
// return a WIDER result set than asked for — the direction that leaks. Errors surface such a
// gap on the first call instead of hiding it.

/** Resolver arguments this helper understands; unknown keys are rejected at runtime. */
export interface NodeQueryParams {
  filter?: Record<string, unknown>
  orderBy?: unknown
  offset?: number | null
  first?: number | null
  [argument: string]: unknown
}

interface NodeQueryConfig {
  /** Neo4j label to match. */
  label: string
  /** Arguments matched for equality against a node property of the same name. */
  equalityFields: string[]
  /**
   * Boolean flags compared through coalesce(), so nodes that never had the property still
   * match `false`. softDeleteMiddleware injects `deleted`/`disabled` as top-level args.
   */
  softDeleteFields?: string[]
  /** The `_*Ordering` enum defining what callers may sort by. */
  orderingEnum: string
  /**
   * ORDER BY used when the caller passes none, given as field + direction so the alias stays
   * derived from `label` instead of being repeated here.
   *
   * NOTE — this is a deliberate behaviour change: neo4j-graphql-js emitted no ORDER BY at all
   * without an explicit `orderBy`, leaving the order up to the database. Paging (`first` /
   * `offset`) over an unordered result is unstable by definition — the same offset can return
   * the same row twice or skip one — so these queries now always order. Each consumer picks
   * the key that matches how its data reads.
   */
  defaultOrder: { field: string; direction: 'ASC' | 'DESC' }
  /** Sortable fields that are NOT stored properties, mapped to their expression. */
  computedOrder?: Record<string, string>
  /** Filter keys understood here — everything else raises. */
  filterFields?: string[]
}

export const nodeQuery =
  (config: NodeQueryConfig) =>
  async (params: NodeQueryParams, context: Context): Promise<unknown[]> => {
    const { label, equalityFields, softDeleteFields = [], orderingEnum, defaultOrder } = config
    const alias = label.toLowerCase()

    const unsupported = Object.keys(params.filter ?? {}).filter(
      (key) => !(config.filterFields ?? []).includes(key),
    )
    if (unsupported.length > 0) {
      throw new UserInputError(`Unsupported ${label} filter: ${unsupported.join(', ')}.`)
    }

    const conditions: string[] = []
    const queryParams: Record<string, unknown> = {}

    for (const field of equalityFields) {
      if (params[field] === undefined || params[field] === null) continue
      // Field names come from the config literal, never from request data.
      conditions.push(`${alias}.${field} = $${field}`)
      queryParams[field] = params[field]
    }
    for (const field of softDeleteFields) {
      if (params[field] === undefined || params[field] === null) continue
      conditions.push(`coalesce(${alias}.${field}, false) = $${field}`)
      queryParams[field] = params[field]
    }
    if (params.filter?.id_in) {
      conditions.push(`${alias}.id IN $filterIdIn`)
      queryParams.filterIdIn = params.filter.id_in
    }

    const order = orderClause(params.orderBy, {
      enumName: orderingEnum,
      alias,
      fallback: `${alias}.${defaultOrder.field} ${defaultOrder.direction}`,
      computed: config.computedOrder,
    })

    const session = context.driver.session()
    try {
      return await session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (${alias}:${label})
            ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
            RETURN ${alias} { .* } AS node
            ORDER BY ${order}
            ${params.offset ? 'SKIP toInteger($offset)' : ''}
            ${params.first ? 'LIMIT toInteger($first)' : ''}
          `,
          { ...queryParams, offset: params.offset ?? 0, first: params.first ?? 0 },
        )
        return result.records.map((record) => unwrap(record.get('node')))
      })
    } finally {
      await session.close()
    }
  }
