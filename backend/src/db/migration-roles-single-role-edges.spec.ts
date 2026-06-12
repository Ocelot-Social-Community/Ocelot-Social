/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Factory, { cleanDatabase } from '@db/factories'
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

const legacyRole = async (userId: string): Promise<string> => {
  const result = await run(`MATCH (u:User {id: $userId}) RETURN u.role AS role`, { userId })
  return result.records[0].get('role') as string
}

describe('migration: single-role-edges', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await Factory.build(
      'user',
      { id: 'admin-id', role: 'admin' },
      { email: 'a@e.org', password: '1' },
    )
    await Factory.build(
      'user',
      { id: 'mod-id', role: 'moderator' },
      { email: 'm@e.org', password: '1' },
    )
    await Factory.build(
      'user',
      { id: 'member-id', role: 'user' },
      { email: 'u@e.org', password: '1' },
    )
    await Factory.build(
      'user',
      { id: 'multi-id', role: 'moderator' },
      { email: 'x@e.org', password: '1' },
    )
    // Role nodes (with ranks, so dedup can order) + a user with TWO edges.
    await run(`
      MERGE (:Role {id: 'owner', name: 'owner', rank: 100})
      MERGE (:Role {id: 'admin', name: 'admin', rank: 80})
      MERGE (:Role {id: 'moderator', name: 'moderator', rank: 50})
      MERGE (:Role {id: 'user', name: 'user', rank: 10})
    `)
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

  it('collapses multiple edges to the highest-rank role', async () => {
    await up(noop)
    expect(await rolesOf('multi-id')).toEqual(['admin']) // admin (80) over moderator (50)
  })

  it('syncs the legacy user.role tier', async () => {
    await up(noop)
    expect(await legacyRole('multi-id')).toBe('admin')
    expect(await legacyRole('member-id')).toBe('user')
  })
})
