// A change written to the database without its event, which is what a missed event looks like
// from the instance that missed it, against the real Neo4j. PolicyService.spec.ts and
// RoleService.spec.ts cover the rules of resync() with the repositories faked.

import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import databaseContext from '@context/database'
import { cleanDatabase } from '@db/factories'
import { PolicyService } from '@src/policy'
import { POLICY_NAMESPACE, writeSetting } from '@src/policy/repository'
import { RoleService } from '@src/role'
import { deleteRole, writeRole } from '@src/role/repository'
import { ADMIN_ROLE, MODERATOR_ROLE } from '@src/role/types'

const db = databaseContext()

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(() => {
  void db.driver.close()
  db.neode.close()
})

describe('resync against the database', () => {
  it('a policy converges to a value whose event was missed, once', async () => {
    const service = new PolicyService(db)
    await service.init({})
    const value = !service.get('publicRegistration')
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', value, 'other-instance')

    await service.resync()
    await service.resync()

    expect(service.get('publicRegistration')).toBe(value)
    expect(service.getLastChange()?.actor).toBe('other-instance')
    expect(service.version).toBe(1)
  })

  it('a policy with nothing to catch up on keeps its version', async () => {
    const service = new PolicyService(db)
    await service.init({})

    await service.resync()

    expect(service.version).toBe(0)
  })

  it('roles converge to a change and a delete whose events were missed, once', async () => {
    const service = new RoleService(db)
    await service.init()
    await writeRole(
      db,
      { name: MODERATOR_ROLE, protected: false, permissions: [] },
      'other-instance',
      new Date().toISOString(),
    )
    await deleteRole(db, ADMIN_ROLE)

    await service.resync()
    await service.resync()

    expect(service.permissionsForRole(MODERATOR_ROLE).size).toBe(0)
    expect(service.getRole(ADMIN_ROLE)).toBeUndefined()
    expect(service.version).toBe(1)
  })

  it('roles with nothing to catch up on keep their version', async () => {
    const service = new RoleService(db)
    await service.init()

    await service.resync()

    expect(service.version).toBe(0)
  })
})
