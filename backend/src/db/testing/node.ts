import { getDriver } from '@db/neo4j'

import { resolveAlias } from './aliases'

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
   * One property. Untyped on purpose: the 82 call sites read a single value and use it
   * straight away (`user.get('encryptedPassword')`), and the declaration cannot narrow it
   * without the caller naming the entity a second time.
   */
  /**
   * The properties, synchronously. neode's Node had this next to `toJson()`, and the
   * attachment specs use it after hydrating a node out of a raw Cypher result.
   */
  properties(): NodeProperties {
    return { ...this.stored }
  }

  get(property: string): unknown {
    return new Map(Object.entries(this.stored)).get(property)
  }

  /** Writes the given properties and keeps the handle in sync with what the database now holds. */
  async update(properties: NodeProperties): Promise<TestNode> {
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
    const pattern =
      direction === 'out'
        ? `(source)-[edge:${type}]->(target)`
        : `(source)<-[edge:${type}]-(target)`

    const session = getDriver().session()
    try {
      await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (source) WHERE id(source) = $sourceId
           MATCH (target) WHERE id(target) = $targetId
           MERGE ${pattern}
           SET edge += $properties`,
          { sourceId: this.internalId, targetId: target.id, properties },
        ),
      )
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
