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
  constructor(
    private readonly entity: EntityDefinition,
    private properties: NodeProperties,
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
    return Promise.resolve({ ...this.properties })
  }

  /**
   * One property. Untyped on purpose: the 82 call sites read a single value and use it
   * straight away (`user.get('encryptedPassword')`), and the declaration cannot narrow it
   * without the caller naming the entity a second time.
   */
  get(property: string): unknown {
    return new Map(Object.entries(this.properties)).get(property)
  }

  /** Writes the given properties and keeps the handle in sync with what the database now holds. */
  async update(properties: NodeProperties): Promise<TestNode> {
    const primary = this.primaryKey()
    const session = getDriver().session()
    try {
      const result = await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (n:${this.entity.label} {${primary.property}: $key})
           SET n += $properties
           RETURN n {.*} AS node`,
          { key: primary.value, properties },
        ),
      )
      this.properties = (result.records[0]?.get('node') ?? this.properties) as NodeProperties
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
    const source = this.primaryKey()
    const other = target.primaryKey()
    const pattern =
      direction === 'out'
        ? `(source)-[edge:${type}]->(target)`
        : `(source)<-[edge:${type}]-(target)`

    const session = getDriver().session()
    try {
      await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (source:${this.entity.label} {${source.property}: $sourceKey})
           MATCH (target:${target.label} {${other.property}: $targetKey})
           MERGE ${pattern}
           SET edge += $properties`,
          { sourceKey: source.value, targetKey: other.value, properties },
        ),
      )
      return this
    } finally {
      await session.close()
    }
  }

  /**
   * How this node is addressed: its first declared uniqueness constraint.
   *
   * `id` for most entities, but `url` for Image and File, `email` for EmailAddress, `code`
   * for InviteCode — the same keys neode called primary.
   */
  private primaryKey(): { property: string; value: unknown } {
    const [first] = this.entity.unique ?? []
    const property = typeof first === 'string' ? first : first?.[0]
    if (!property) {
      throw new Error(`${this.entity.label} declares no unique property to address a node by`)
    }
    const value = new Map(Object.entries(this.properties)).get(property)
    if (value === undefined) {
      throw new Error(`${this.entity.label} fixture carries no ${property}`)
    }
    return { property, value }
  }
}
