/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'
import { effectiveRoleNames } from '@src/role'

import { down, up } from './20260611120000-roles-to-has-role-edges'

const noop = () => undefined

const rolesOf = async (userId: string): Promise<string[]> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((tx) =>
      tx.run(`MATCH (:User {id: $userId})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name`, { userId }),
    )
    return result.records.map((record) => record.get('name') as string).sort()
  } finally {
    await session.close()
  }
}

describe('migration: roles-to-has-role-edges', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await Factory.build(
      'user',
      { id: 'admin-id', role: 'admin' },
      { email: 'a@e.org', password: '1234' },
    )
    await Factory.build(
      'user',
      { id: 'mod-id', role: 'moderator' },
      { email: 'm@e.org', password: '1234' },
    )
    await Factory.build(
      'user',
      { id: 'owner-id', role: 'owner' },
      { email: 'o@e.org', password: '1234' },
    )
    await Factory.build(
      'user',
      { id: 'member-id', role: 'user' },
      { email: 'u@e.org', password: '1234' },
    )
  })

  afterAll(async () => {
    await cleanDatabase()
    await getDriver().close()
  })

  describe('up', () => {
    beforeEach(async () => {
      await up(noop)
    })

    it('creates one HAS_ROLE edge for each non-baseline legacy role', async () => {
      expect(await rolesOf('admin-id')).toEqual(['admin'])
      expect(await rolesOf('mod-id')).toEqual(['moderator'])
      expect(await rolesOf('owner-id')).toEqual(['owner'])
    })

    it('leaves baseline members without an edge (the user role is implicit)', async () => {
      expect(await rolesOf('member-id')).toEqual([])
    })

    it('preserves the resolved role set for every legacy role (behaviour equivalence)', async () => {
      const cases: Array<{ id: string; legacy: string }> = [
        { id: 'admin-id', legacy: 'admin' },
        { id: 'mod-id', legacy: 'moderator' },
        { id: 'owner-id', legacy: 'owner' },
        { id: 'member-id', legacy: 'user' },
      ]
      for (const { id, legacy } of cases) {
        const viaEdges = effectiveRoleNames({ roles: await rolesOf(id) })
        const viaLegacy = effectiveRoleNames({ role: legacy })
        expect(viaEdges.sort()).toEqual(viaLegacy.sort())
      }
    })

    it('is idempotent (re-running up adds no duplicate edges)', async () => {
      await up(noop)
      expect(await rolesOf('admin-id')).toEqual(['admin'])
    })
  })

  describe('down', () => {
    it('removes the migrated edges', async () => {
      await up(noop)
      await down(noop)
      expect(await rolesOf('admin-id')).toEqual([])
      expect(await rolesOf('mod-id')).toEqual([])
      expect(await rolesOf('owner-id')).toEqual([])
    })
  })
})
