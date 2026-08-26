import { getDriver } from '@db/neo4j'
import { relationships } from '@db/schema/relationships'
import { validateProperties } from '@db/schema/validate'

import { resolveAlias } from './aliases'
import { asPlainValues, declaredProperty, onlyDeclared, timestamp } from './defaults'

import type { EntityDefinition } from '@db/schema/types'

// A fixture handle, backed by raw Cypher.
//
// The factories used to hand back a neode Node, and the tests learned to speak to it: 585
// `toJson()`, 82 `get()`, 37 `update()` and 281 `relateTo()` calls across the factories, the
// seed and 74 spec files. That vocabulary is what this reproduces — nothing more. Everything
// else neode's Node offered (eager loading, cascades, its query builder) is deliberately
// absent, because a grep says nothing uses it: no spec reads `.emoted`, `.belongsTo` or
// `.ownedBy` off a `toJson()` result, which was the only place eager loading showed.
//
// Not a general-purpose ORM, and not for production code — production writes its own Cypher
// since the resolvers stopped using neode. This exists so that replacing an ORM does not turn
// into rewriting every test in the repository.

export interface NodeProperties {
  [property: string]: unknown
}

export class TestNode {
  /**
   * @param internalId Neo4j's own node id, captured when the node was created or read.
   *
   * Nodes are addressed by it rather than by a primary key, because not every entity has one:
   * UnverifiedEmailAddress deliberately carries no uniqueness constraint (the same address may
   * await verification for several users), and a handle has to work for those too.
   */
  constructor(
    private readonly entity: EntityDefinition,
    private stored: NodeProperties,
    private readonly internalId: number,
  ) {}

  get label(): string {
    return this.entity.label
  }

  /**
   * The node's properties.
   *
   * Async because neode's was, and 585 call sites await it. It answers from what the write
   * returned rather than reading again — the node cannot have changed between the two, and a
   * round trip per call would show in a suite that builds thousands of fixtures.
   */
  async toJson(): Promise<NodeProperties> {
    return Promise.resolve({ ...this.stored })
  }

  /**
   * The properties, synchronously. neode's Node had this next to `toJson()`, and the
   * attachment specs use it after hydrating a node out of a raw Cypher result.
   */
  properties(): NodeProperties {
    return { ...this.stored }
  }

  /**
   * One property. Untyped on purpose: the 82 call sites read a single value and use it
   * straight away (`user.get('encryptedPassword')`), and the declaration cannot narrow it
   * without the caller naming the entity a second time.
   *
   * Read through the own-property descriptor rather than `this.stored[property]`: the argument
   * comes from the caller, and an index would resolve `toString` or `constructor` off the
   * prototype and hand back a function where the node has no such property. It is also the
   * pattern the security lint flags. The descriptor answers in constant time — the Map this
   * replaces was built per read, over every key, 82 call sites deep.
   */
  get(property: string): unknown {
    return Object.getOwnPropertyDescriptor(this.stored, property)?.value
  }

  /**
   * Writes the given properties and keeps the handle in sync with what the database now holds.
   *
   * Checked against the declaration first, in two steps that answer different questions.
   *
   * The NAMES in the patch, one by one: `SET n += $properties` writes whatever it is handed, so
   * a typo at one of the fifty call sites used to add a property instead of changing one, and
   * the fixture then held a node the declaration says cannot exist. The audit finds those
   * afterwards; naming the key here saves the search. Rejected rather than dropped, unlike
   * createNode: nothing routes rosie's build options through this method, so an unknown name
   * here is a mistake and never a spare argument.
   *
   * The VALUE of the whole node, once the patch is applied: a partial write cannot be validated
   * on its own, because `required` is a statement about the finished node — `{ deleted: true }`
   * alone fails every entity in the registry. Undeclared properties already ON the node are
   * ignored (`onlyDeclared`); they may predate the handle, a migration spec puts them there on
   * purpose, and they are the audit's business rather than this caller's.
   */
  async update(properties: NodeProperties): Promise<TestNode> {
    for (const property of Object.keys(properties)) {
      declaredProperty(this.entity, property)
    }
    // Nulls are dropped for the same reason createNode drops them: `SET n.x = null` REMOVES the
    // property in Neo4j, so the node that will exist is the one without it.
    const applied = Object.fromEntries(
      Object.entries(onlyDeclared(this.entity, { ...this.stored, ...properties })).filter(
        ([, value]) => value !== null,
      ),
    )
    const invalid = validateProperties(this.entity, asPlainValues(applied))
    if (invalid) {
      throw new Error(`Cannot update a ${this.entity.label} fixture: ${invalid}`)
    }

    const session = getDriver().session()
    try {
      const result = await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (n) WHERE id(n) = $internalId
           SET n += $properties
           RETURN n {.*} AS node`,
          { internalId: this.internalId, properties },
        ),
      )
      this.stored = (result.records[0]?.get('node') ?? this.stored) as NodeProperties
      return this
    } finally {
      await session.close()
    }
  }

  /**
   * Creates an edge to another fixture, naming it the way the models did.
   *
   * MERGE, not CREATE: neode's relateTo merged unless told otherwise, and fixtures relate the
   * same pair twice often enough that switching to CREATE would quietly double edges — which
   * a cardinality audit would then report as a violation the test never intended.
   */
  async relateTo(
    target: TestNode,
    alias: string,
    properties: NodeProperties = {},
  ): Promise<TestNode> {
    const { type, direction } = resolveAlias(this.entity.label, alias)
    // Edge property defaults, the counterpart to defaults.ts for nodes: neode applied the
    // relationship's model defaults on every relateTo, and resolvers project them
    // (`pinnedAt: pinned.createdAt`). Without them a fixture edge exists but carries nothing,
    // and the field reads as null.
    const declared = relationships.find((relationship) => relationship.type === type)
    const declaredEdgeProperties = new Map(Object.entries(declared?.properties ?? {}))
    const given = new Map(Object.entries(properties))
    const edge = new Map(given)
    for (const property of ['createdAt', 'updatedAt']) {
      if (declaredEdgeProperties.has(property) && given.get(property) === undefined) {
        // `timestamp()`, not `new Date()`: writing Cypher directly is fast enough that
        // consecutive fixtures land in the same millisecond, and an edge timestamp is sorted
        // on just like a node's — notifications.ts orders by `notification.updatedAt`, which
        // is the NOTIFIED edge. See the note above the helper in defaults.ts.
        edge.set(property, timestamp())
      }
    }
    const edgeProperties = Object.fromEntries(edge)
    const pattern =
      direction === 'out'
        ? `(source)-[edge:${type}]->(target)`
        : `(source)<-[edge:${type}]-(target)`

    const session = getDriver().session()
    try {
      const result = await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (source) WHERE id(source) = $sourceId
           MATCH (target) WHERE id(target) = $targetId
           MERGE ${pattern}
           SET edge += $properties
           RETURN id(edge) AS edgeId`,
          { sourceId: this.internalId, targetId: target.id, properties: edgeProperties },
        ),
      )
      // A MATCH that finds nothing yields no rows, so the MERGE never runs — and Cypher calls
      // that a successful query. Unchecked, a fixture then carries no edge and the spec fails
      // somewhere else entirely, on a field that reads as null. Both ways to get here are
      // mistakes worth naming: a handle whose node was removed in between (cleanDatabase
      // between build and relate) and a handle that never had a real id.
      if (result.records.length === 0) {
        throw new Error(
          `Could not relate ${this.entity.label}(${String(this.internalId)}) ` +
            `-[:${type}]-> ${target.label}(${String(target.id)}) via "${alias}": ` +
            `one of the two nodes does not exist.`,
        )
      }
      return this
    } finally {
      await session.close()
    }
  }

  /** Neo4j's node id, so another handle can point an edge at this one. */
  get id(): number {
    return this.internalId
  }
}
