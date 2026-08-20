import { getDriver } from '@db/neo4j'
import { validateProperties } from '@db/schema/validate'

import { TestNode } from './node'

import type { NodeProperties } from './node'
import type { EntityDefinition } from '@db/schema/types'

// Creating a fixture node.
//
// This is where neode contributed the most and said the least: `neode.create('User', attrs)`
// applied every `default` from the model, converted `int` properties, dropped keys the model
// did not know, and validated the rest. Three of those four are things a test WANTS spelled
// out, and the fourth — dropping unknown keys — is what let `Group.myRole` be persisted for
// years without anyone noticing.
//
// So: the caller passes what the node will carry, and it is checked against the declaration
// before it is written. No hidden defaults.

/** Properties every fixture gets unless the caller sets them, mirroring what resolvers write. */
const conventions = (entity: EntityDefinition, properties: NodeProperties): NodeProperties => {
  const now = new Date().toISOString()
  const declared = new Map(Object.entries(entity.properties))
  // Through a Map: `property` comes from the loop, and indexing an object with a variable is
  // the pattern the security lint flags.
  const filled = new Map(Object.entries(properties))
  for (const property of ['createdAt', 'updatedAt']) {
    const missing = filled.get(property) === undefined
    if (declared.has(property) && entity.required.includes(property) && missing) {
      filled.set(property, now)
    }
  }
  return Object.fromEntries(filled)
}

/**
 * Writes one node and returns a handle to it.
 *
 * Validation is not optional here. It is the same check the write path in production performs
 * (db/schema/validate.ts) — a fixture that could not exist in production is a fixture that
 * teaches a test the wrong thing, which is the failure mode writerParity.spec.ts exists to
 * catch. Where a test NEEDS an impossible node — a deleted user, a legacy shape for a
 * migration test — it says so by passing those properties explicitly, and they are declared.
 */
export const createNode = async (
  entity: EntityDefinition,
  properties: NodeProperties,
  // Secondary labels, e.g. `(:Post:Article)`. Restricted to what the entity declares in
  // `alsoLabelled`, because this is exactly the place where neode's `extend('Post','Article')`
  // used to create a whole shadow model — and with it a second set of constraints nobody asked
  // for (see migration 20260820140000).
  additionalLabels: readonly string[] = [],
): Promise<TestNode> => {
  const permitted = entity.alsoLabelled ?? []
  const unknown = additionalLabels.filter((label) => !permitted.includes(label))
  if (unknown.length > 0) {
    throw new Error(`${entity.label} does not declare the secondary label(s) ${unknown.join(', ')}`)
  }
  const complete = conventions(entity, properties)
  const invalid = validateProperties(entity, complete)
  if (invalid) {
    throw new Error(`Cannot build a ${entity.label} fixture: ${invalid}`)
  }

  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) =>
      transaction.run(
        `CREATE (node:${[entity.label, ...additionalLabels].join(':')})
         SET node += $properties
         RETURN node {.*} AS node`,
        { properties: complete },
      ),
    )
    return new TestNode(entity, result.records[0].get('node') as NodeProperties)
  } finally {
    await session.close()
  }
}

/** Wraps an existing node, for the factories that look one up instead of creating it. */
export const findNode = async (
  entity: EntityDefinition,
  property: string,
  value: unknown,
): Promise<TestNode | null> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run(
        `MATCH (node:${entity.label} {${property}: $value}) RETURN node {.*} AS node`,
        { value },
      ),
    )
    const found = result.records[0]?.get('node') as NodeProperties | undefined
    return found ? new TestNode(entity, found) : null
  } finally {
    await session.close()
  }
}
