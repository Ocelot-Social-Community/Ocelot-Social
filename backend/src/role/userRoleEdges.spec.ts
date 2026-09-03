/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { describe, beforeEach, afterAll, it, expect } from 'vitest'

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

const deleteRoleNode = async (name: string): Promise<void> => {
  const session = getDriver().session()
  try {
    await session.writeTransaction((tx) =>
      tx.run(`MATCH (r:Role {id: $name}) DETACH DELETE r`, { name }),
    )
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
    // Driver close can run in the background (repo teardown pattern); only the
    // cleanup needs awaiting.
    void getDriver().close()
  })

  it('seeds the default role nodes', async () => {
    await ensureUserRoleEdges()

    await expect(roleNodeExists('owner')).resolves.toBe(true)
    await expect(roleNodeExists('user')).resolves.toBe(true)
  })

  it('gives every (edgeless) user a HAS_ROLE edge matching their legacy tier', async () => {
    await ensureUserRoleEdges()

    await expect(rolesOf('a')).resolves.toEqual(['admin'])
    await expect(rolesOf('m')).resolves.toEqual(['moderator'])
    await expect(rolesOf('u')).resolves.toEqual(['user'])
  })

  it('is idempotent — re-running adds no duplicate edges', async () => {
    await ensureUserRoleEdges()
    await ensureUserRoleEdges()

    await expect(rolesOf('a')).resolves.toEqual(['admin'])
  })

  describe(promoteToOwner, () => {
    it('promotes a user found by email, replacing their previous role', async () => {
      await ensureUserRoleEdges() // 'u' now holds the user edge
      const result = await promoteToOwner('u@e.org')

      expect(result?.id).toBe('u')
      await expect(rolesOf('u')).resolves.toEqual(['owner']) // single edge, replaced
    })

    it('promotes a user found by id (seeds roles itself, no prior edge needed)', async () => {
      const result = await promoteToOwner('a')

      expect(result?.id).toBe('a')
      await expect(rolesOf('a')).resolves.toEqual(['owner'])
    })

    it('promotes a user found by slug', async () => {
      // 'slug-user' is neither an id nor an email of any user, so this exercises
      // the slug branch of the matcher exclusively.
      await Factory.build(
        'user',
        { id: 's', slug: 'slug-user', role: 'user' },
        { email: 's@e.org', password: '1' },
      )
      const result = await promoteToOwner('slug-user')

      expect(result?.id).toBe('s')
      await expect(rolesOf('s')).resolves.toEqual(['owner'])
    })

    it('returns null for an unknown identifier', async () => {
      await expect(promoteToOwner('nobody@nowhere.org')).resolves.toBeNull()
    })
  })

  describe('seed policy (durable deletion of optional roles)', () => {
    // cleanDatabase (beforeEach) seeds a fresh DB, so all four roles exist here.
    it('does not resurrect a deleted admin/moderator on an established DB', async () => {
      await deleteRoleNode('moderator')
      await deleteRoleNode('admin')

      await seedDefaultRoleNodes() // DB is non-empty ⇒ only owner & user are ensured

      await expect(roleNodeExists('moderator')).resolves.toBe(false)
      await expect(roleNodeExists('admin')).resolves.toBe(false)
      // mandatory roles remain
      await expect(roleNodeExists('owner')).resolves.toBe(true)
      await expect(roleNodeExists('user')).resolves.toBe(true)
    })

    it('re-creates the mandatory owner & user roles if they were deleted', async () => {
      await deleteRoleNode('owner')
      await deleteRoleNode('user')
      // admin/moderator still present ⇒ DB is non-empty (established path)

      await seedDefaultRoleNodes()

      await expect(roleNodeExists('owner')).resolves.toBe(true)
      await expect(roleNodeExists('user')).resolves.toBe(true)
    })

    it('seeds the full set again only when the DB is completely empty', async () => {
      await deleteRoleNode('owner')
      await deleteRoleNode('admin')
      await deleteRoleNode('moderator')
      await deleteRoleNode('user')

      await seedDefaultRoleNodes() // empty ⇒ fresh install ⇒ all four

      await expect(roleNodeExists('owner')).resolves.toBe(true)
      await expect(roleNodeExists('admin')).resolves.toBe(true)
      await expect(roleNodeExists('moderator')).resolves.toBe(true)
      await expect(roleNodeExists('user')).resolves.toBe(true)
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

      await expect(rolesOf('o')).resolves.toEqual(['owner']) // owner edge, not the admin tier
    })
  })
})
