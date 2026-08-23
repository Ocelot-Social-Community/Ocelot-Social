import { getDriver } from '@db/neo4j'
import { entities } from '@db/schema/index'

import { createNode, findNode } from './create'
import { onlyDeclared } from './defaults'
import { TestNode } from './node'

import type { NodeProperties } from './node'
import type { EntityDefinition } from '@db/schema/types'
import type { QueryResult } from 'neo4j-driver'

// The fixture API the specs already speak.
//
// 72 spec files reach past the factories and build nodes themselves — `database.neode.create`,
// `.model('User').create`, `.first`, `.find`, `.cypher`. That is 127 call sites, but only five
// shapes, so they are reproduced here instead of rewritten.
//
// This is not cosmetic. The specs pass the nodes they build INTO the factories
// (`Factory.build('post', {}, { author })`), so as long as two different node types exist, the
// two halves of a fixture cannot be related to each other — which is exactly how the first full
// run after the factory rewrite failed, 68 tests deep. One type, one API.
//
// `database.neode` stays as a deprecated alias so no spec has to change today; the honest name
// is `database.fixtures`, and renaming the call sites is a mechanical step with no deadline.

const entityFor = (label: string): EntityDefinition => {
  const entity = entities.find((candidate) => candidate.label === label)
  if (!entity) {
    throw new Error(`No entity declared for label ${label}. See src/db/schema/index.ts`)
  }
  return entity
}

export interface FixtureApi {
  create: (label: string, properties: NodeProperties) => Promise<TestNode>
  model: (label: string) => FixtureModel
  /**
   * A node by its primary key. Throws when there is none, for the same reason `first` does:
   * every call site uses the result immediately.
   */
  find: (label: string, id: unknown) => Promise<TestNode>
  /**
   * The first node matching a property map.
   *
   * neode's signature, which the specs use in two shapes: `first('User', { id: 'u3' },
   * undefined)` and `first('File', {}, undefined)` for "any of them". The generic they pass is
   * a model type and carries no information here, so it is accepted and ignored.
   *
   * Throws when nothing matches. The 14 call sites all use the result immediately
   * (`(await neode.first(...)).toJson()`), so a null would only turn into a less informative
   * error one line later.
   */
  first: (label: string, where: Record<string, unknown>, _unused?: unknown) => Promise<TestNode>
  /** Every node of a label. Specs assert on its LENGTH, which is all neode's collection was used for. */
  all: (label: string) => Promise<TestNode[]>
  /**
   * Turns the node under `alias` in a raw Cypher result into a fixture handle.
   *
   * neode called this hydrating: the specs run their own Cypher and then want the node as an
   * object. Returns null when the result has no such row, which is what the assertions check.
   */
  hydrateFirst: (result: QueryResult, alias: string, model: FixtureModel) => TestNode | null
  /**
   * The escape hatch: a spec's own Cypher, run as a WRITE transaction whatever it says.
   *
   * Deliberately one door and not two. The helper is handed an opaque string, so it cannot
   * tell a read from a write, and the caller that names the wrong door gets a failure — an
   * `ON CREATE SET` sent through a read transaction does not warn, it errors. Routing is the
   * only thing the split would buy, and it buys nothing here: this runs against a single
   * instance in jest and in the Cypress support process, never against a cluster with read
   * replicas.
   *
   * Where the distinction does matter, it is already made: `context.database` exposes `query`
   * (read) next to `write`, and production goes through those.
   */
  cypher: (query: string, parameters?: Record<string, unknown>) => Promise<QueryResult>
  /** No-op. Kept because spec teardowns call it; the driver is closed centrally. */
  close: () => void
}

/** What `model(label)` hands back: enough to create with, and enough to hydrate with. */
export interface FixtureModel {
  readonly entity: EntityDefinition
  create: (properties: NodeProperties) => Promise<TestNode>
}

export const fixtures: FixtureApi = {
  create: async (label, properties) => {
    const entity = entityFor(label)
    return createNode(entity, onlyDeclared(entity, properties))
  },

  model: (label) => {
    const entity = entityFor(label)
    return {
      entity,
      create: async (properties) => createNode(entity, onlyDeclared(entity, properties)),
    }
  },

  // neode's `find` looked a node up by its primary key. Here that is the first declared
  // uniqueness constraint, which is the same property in every case.
  find: async (label, id) => {
    const entity = entityFor(label)
    const [unique] = entity.unique ?? []
    const property = typeof unique === 'string' ? unique : unique?.[0]
    if (!property) {
      throw new Error(`${label} declares no unique property to look a node up by`)
    }
    const found = await findNode(entity, property, id)
    if (!found) {
      throw new Error(`No ${label} with ${property} ${String(id)}`)
    }
    return found
  },

  first: async (label, where) => {
    const entity = entityFor(label)
    const [property, value] = Object.entries(where)[0] ?? []
    const session = getDriver().session()
    try {
      const result = await session.readTransaction((transaction) =>
        transaction.run(
          property === undefined
            ? `MATCH (node:${entity.label}) RETURN node {.*} AS node, id(node) AS internalId LIMIT 1`
            : `MATCH (node:${entity.label} {${property}: $value}) RETURN node {.*} AS node, id(node) AS internalId LIMIT 1`,
          { value },
        ),
      )
      const record = result.records[0]
      if (!record) {
        throw new Error(`No ${label} matching ${JSON.stringify(where)}`)
      }
      return new TestNode(
        entity,
        record.get('node') as NodeProperties,
        (record.get('internalId') as { toNumber: () => number }).toNumber(),
      )
    } finally {
      await session.close()
    }
  },

  all: async (label) => {
    const entity = entityFor(label)
    const session = getDriver().session()
    try {
      const result = await session.readTransaction((transaction) =>
        transaction.run(
          `MATCH (node:${entity.label}) RETURN node {.*} AS node, id(node) AS internalId`,
        ),
      )
      return result.records.map(
        (record) =>
          new TestNode(
            entity,
            record.get('node') as NodeProperties,
            (record.get('internalId') as { toNumber: () => number }).toNumber(),
          ),
      )
    } finally {
      await session.close()
    }
  },

  cypher: async (query, parameters = {}) => {
    const session = getDriver().session()
    try {
      return await session.writeTransaction((transaction) => transaction.run(query, parameters))
    } finally {
      await session.close()
    }
  },

  hydrateFirst: (result, alias, model) => {
    const node = result.records[0]?.get(alias) as {
      properties?: NodeProperties
      identity?: { toNumber: () => number }
    } | null
    if (!node?.properties) {
      // null, NOT a throw: several specs hydrate precisely to assert that a node is GONE
      // ("removes previous `EmailAddress` node"), so absence is a legitimate answer here.
      return null
    }
    if (node.identity === undefined) {
      // A throw, unlike the absence above, because there is no sensible handle to hand back.
      // The previous fallback of -1 produced one that LOOKED fine and quietly did nothing:
      // `relateTo` matches its endpoints by `id(n)`, so a -1 source matches no node, the MERGE
      // never runs, and the spec sees a fixture with a missing edge and nothing to explain it.
      //
      // Every node the driver returns carries an identity, so this is a guard against a shape
      // that should not occur rather than a case anyone has hit — which is exactly why it must
      // not be papered over with a sentinel.
      throw new Error(
        `Cannot hydrate ${model.entity.label} from "${alias}": the column holds no node id. ` +
          `Return the node itself (RETURN n AS ${alias}), not a projection of it.`,
      )
    }
    return new TestNode(model.entity, node.properties, node.identity.toNumber())
  },

  close: () => {
    // Deliberately empty: neode owned its own driver and had to be closed. The fixtures use
    // the shared one, which db/neo4j.ts closes.
  },
}
