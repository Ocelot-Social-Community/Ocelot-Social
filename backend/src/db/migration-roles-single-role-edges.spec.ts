import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { up } from './migrations/20260611120000-roles-single-role-edges'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

const rolesOf = async (userId: string): Promise<string[]> => {
  const result = await run(
    `MATCH (:User {id: $userId})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name`,
    { userId },
  )
  return result.records.map((r) => r.get('name') as string).sort()
}

const legacyRole = async (userId: string): Promise<string | null> => {
  const result = await run(`MATCH (u:User {id: $userId}) RETURN u.role AS role`, { userId })
  return result.records[0].get('role') as string | null
}

describe('migration: single-role-edges', () => {
  beforeEach(async () => {
    await cleanDatabase()
    // Legacy-shaped data built via raw Cypher (NOT the factory, which already creates
    // HAS_ROLE edges): users carry the legacy `role` tier and have no edge yet. The
    // migration must derive the edge and then drop `role`.
    await run(`
      CREATE (:User {id: 'admin-id', role: 'admin', deleted: false})
      CREATE (:User {id: 'mod-id', role: 'moderator', deleted: false})
      CREATE (:User {id: 'member-id', role: 'user', deleted: false})
      CREATE (:User {id: 'multi-id', role: 'moderator', deleted: false})
    `)
    // A user with TWO edges (to exercise the dedup collapse). cleanDatabase already
    // seeded the role nodes.
    await run(`
      MATCH (u:User {id: 'multi-id'}), (a:Role {id: 'admin'}), (m:Role {id: 'moderator'})
      MERGE (u)-[:HAS_ROLE]->(a)
      MERGE (u)-[:HAS_ROLE]->(m)
    `)
  })

  afterAll(async () => {
    await cleanDatabase()
    await getDriver().close()
  })

  it('gives every user exactly one role edge matching their tier', async () => {
    await up(noop)
    expect(await rolesOf('admin-id')).toEqual(['admin'])
    expect(await rolesOf('mod-id')).toEqual(['moderator'])
    expect(await rolesOf('member-id')).toEqual(['user']) // baseline gets an explicit edge
  })

  it('collapses multiple edges to a single deterministic role', async () => {
    await up(noop)
    // owner-first then alphabetical → admin wins over moderator
    expect(await rolesOf('multi-id')).toEqual(['admin'])
  })

  it('drops the legacy user.role property', async () => {
    await up(noop)
    expect(await legacyRole('admin-id')).toBeNull()
    expect(await legacyRole('member-id')).toBeNull()
  })
})
