import type { SchemaRunner } from './apply'
import type { Session } from 'neo4j-driver'

// The one adapter from a driver session to the `SchemaRunner` port.
//
// Its two callers must not diverge: `db/migrate/store.ts` runs the plan on every deployment
// (the init container), and `db/schema/run-audit.ts` is the operator tool that tells an
// operator what that deployment WILL do. Two copies of this file made the answer and the act
// two different code paths — the reason it lives here rather than in each of them.
//
// Kept out of apply.ts on purpose: that module declares the port and takes no driver, which
// is what makes the sequencing testable without a database (see apply.spec.ts). This is the
// production wiring of the same port, and it is the only place `neo4j-driver` enters the
// derive layer.

/**
 * A count as a number, whatever the driver handed back.
 *
 * `count(...)` comes back as a Neo4j Integer, not a JS number: a 64-bit value the driver
 * refuses to lose precision on. `.toString()` rather than `.toNumber()` because the latter
 * throws above 2^53 — a schema audit is never near that, but a count that overflows should
 * read as a large number rather than take the run down. A missing record (an empty result)
 * counts as zero, which is what "no violations found" means.
 */
const asNumber = (value: unknown): number =>
  typeof value === 'number'
    ? value
    : Number((value as { toString: () => string } | null)?.toString() ?? 0)

/**
 * Binds the port to a session.
 *
 * `count` and `sample` read, `execute` writes — and `execute` deliberately uses `session.run`
 * rather than a write transaction: DDL is schema work, which Neo4j Community will not run
 * inside an explicit transaction alongside anything else.
 */
export const runnerFor = (session: Session): SchemaRunner => ({
  count: async (cypher) => {
    const result = await session.readTransaction((transaction) => transaction.run(cypher))
    return asNumber(result.records[0]?.get(0))
  },
  sample: async (cypher) => {
    const result = await session.readTransaction((transaction) => transaction.run(cypher))
    return result.records.map((record) => record.toObject())
  },
  execute: async (cypher) => {
    await session.run(cypher)
  },
})
