/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { ensureUserRoleEdges, promoteToOwner, seedDefaultRoleNodes } from './userRoleEdges'

const rolesOf = async (userId: string): Promise<string[]> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((tx) =>
      tx.run(`MATCH (:User {id: $userId})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name`, { userId }),
    )
    return result.records.map((r) => r.get('name') as string).sort()
  } finally {
    await session.close()
  }
}

const roleNodeExists = async (name: string): Promise<boolean> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((tx) =>
      tx.run(`MATCH (r:Role {id: $name}) RETURN count(r) AS c`, { name }),
    )
    return Number(result.records[0].get('c')) > 0
  } finally {
    await session.close()
  }
}


describe('role-edge helpers (DB)', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await Factory.build('user', { id: 'a', role: 'admin' }, { email: 'a@e.org', password: '1' })
    await Factory.build('user', { id: 'm', role: 'moderator' }, { email: 'm@e.org', password: '1' })
    await Factory.build('user', { id: 'u', role: 'user' }, { email: 'u@e.org', password: '1' })
  })

  afterAll(async () => {
    await cleanDatabase()
    await getDriver().close()
  })

  it('seeds the default role nodes', async () => {
    await ensureUserRoleEdges()
    expect(await roleNodeExists('owner')).toBe(true)
    expect(await roleNodeExists('user')).toBe(true)
  })

  it('gives every (edgeless) user a HAS_ROLE edge matching their legacy tier', async () => {
    await ensureUserRoleEdges()
    expect(await rolesOf('a')).toEqual(['admin'])
    expect(await rolesOf('m')).toEqual(['moderator'])
    expect(await rolesOf('u')).toEqual(['user'])
  })

  it('is idempotent — re-running adds no duplicate edges', async () => {
    await ensureUserRoleEdges()
    await ensureUserRoleEdges()
    expect(await rolesOf('a')).toEqual(['admin'])
  })

  describe('promoteToOwner', () => {
    it('promotes a user found by email, replacing their previous role', async () => {
      await ensureUserRoleEdges() // 'u' now holds the user edge
      const result = await promoteToOwner('u@e.org')
      expect(result?.id).toBe('u')
      expect(await rolesOf('u')).toEqual(['owner']) // single edge, replaced
    })

    it('promotes a user found by id (seeds roles itself, no prior edge needed)', async () => {
      const result = await promoteToOwner('a')
      expect(result?.id).toBe('a')
      expect(await rolesOf('a')).toEqual(['owner'])
    })

    it('returns null for an unknown identifier', async () => {
      expect(await promoteToOwner('nobody@nowhere.org')).toBeNull()
    })
  })

  describe('factory roleName option', () => {
    it('links a user to the given role node at creation, overriding the tier', async () => {
      await seedDefaultRoleNodes() // role nodes must exist for the factory edge
      await Factory.build(
        'user',
        { id: 'o', role: 'admin' },
        { email: 'o@e.org', password: '1', roleName: 'owner' },
      )
      expect(await rolesOf('o')).toEqual(['owner']) // owner edge, not the admin tier
    })
  })
})
