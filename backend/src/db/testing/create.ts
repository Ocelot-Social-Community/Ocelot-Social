import { getDriver } from '@db/neo4j'
import { validateProperties } from '@db/schema/validate'

import { onlyDeclared, withDefaults } from './defaults'
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
  // A null value means "no such property": that is what `SET n.x = null` does in Neo4j, so a
  // node never holds one. Dropping them before validation is therefore not leniency — it is
  // describing the node that will actually exist. The fixtures rely on it to clear a default
  // (`Factory.build('emailAddress', { verifiedAt: null })` for an unverified address).
  // Undeclared keys are dropped rather than rejected — the one place this layer is lenient,
  // and deliberately so. rosie cannot tell an OPTION passed in the attributes slot
  // (`Factory.build('post', { authorId })`) from a property, and neode's model filtering is
  // what made those call sites work for years. Rejecting them would mean editing test files
  // to remove keys that never reached a node.
  //
  // What is NOT lost: the write path in production still refuses undeclared properties
  // (db/schema/validate.ts), and run-audit.ts reports any that reach the database anyway. The
  // guard moved from the ORM to the two places that can act on it.
  const complete = Object.fromEntries(
    Object.entries(onlyDeclared(entity, withDefaults(entity, properties))).filter(
      ([, value]) => value !== null,
    ),
  )
  // Neo4j Integers are objects; the declaration describes the unwrapped value, so they are
  // validated as the numbers they represent and written as the Integers they are.
  const asPlainValues = Object.fromEntries(
    Object.entries(complete).map(([name, value]) => [
      name,
      typeof value === 'object' && value !== null && 'toNumber' in value
        ? (value as { toNumber: () => number }).toNumber()
        : value,
    ]),
  )
  const invalid = validateProperties(entity, asPlainValues)
  if (invalid) {
    throw new Error(`Cannot build a ${entity.label} fixture: ${invalid}`)
  }

  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) =>
      transaction.run(
        `CREATE (node:${[entity.label, ...additionalLabels].join(':')})
         SET node += $properties
         RETURN node {.*} AS node, id(node) AS internalId`,
        { properties: complete },
      ),
    )
    const record = result.records[0]
    return new TestNode(
      entity,
      record.get('node') as NodeProperties,
      (record.get('internalId') as { toNumber: () => number }).toNumber(),
    )
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
        `MATCH (node:${entity.label} {${property}: $value})
         RETURN node {.*} AS node, id(node) AS internalId`,
        { value },
      ),
    )
    const record = result.records[0]
    if (!record) {
      return null
    }
    return new TestNode(
      entity,
      record.get('node') as NodeProperties,
      (record.get('internalId') as { toNumber: () => number }).toNumber(),
    )
  } finally {
    await session.close()
  }
}
