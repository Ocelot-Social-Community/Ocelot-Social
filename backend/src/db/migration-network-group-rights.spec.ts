import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { down, up } from './migrations/20261004110000-network-group-rights'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

const permissionsOf = async (id: string): Promise<string[]> => {
  const result = await run(`MATCH (r:Role {id: $id}) RETURN r.permissions AS permissions`, { id })
  return JSON.parse(result.records[0].get('permissions') as string) as string[]
}

const role = async (id: string, permissions: string[], isProtected = false) =>
  run(`CREATE (:Role {id: $id, protected: $isProtected, permissions: $permissions})`, {
    id,
    isProtected,
    permissions: JSON.stringify(permissions),
  })

describe('migration: network-group-rights', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('adds the per-door video call rights NEXT TO the per-type ones', async () => {
    // The current webapp still asks for videoCall.create_<type> to decide whether the call
    // button may open a call, so the old key has to survive the migration.
    await role('migration-caller', ['videoCall.create_public', 'videoCall.create_hidden'])

    await up(noop)

    expect(await permissionsOf('migration-caller')).toEqual([
      'videoCall.create_public',
      'videoCall.create_hidden',
      'videoCall.create_open',
      'videoCall.create_restricted',
    ])
  })

  it('gives a moderating role the closed groups, and an administering one everything', async () => {
    await role('migration-moderator', ['content.moderate'])
    await role('migration-admin', ['role.manage'])

    await up(noop)

    expect(await permissionsOf('migration-moderator')).toEqual([
      'content.moderate',
      'group.content.read.any_closed',
      'group.moderate.any_closed',
    ])
    expect(await permissionsOf('migration-admin')).toEqual([
      'role.manage',
      'group.content.read.any_closed',
      'group.moderate.any_closed',
      'group.content.read.any_hidden',
      'group.moderate.any_hidden',
      'group.administer.any_public',
      'group.administer.any_closed',
      'group.administer.any_hidden',
      'group.roleTemplate.manage',
    ])
  })

  it('grants nothing to the baseline, and leaves a protected role alone', async () => {
    await role('migration-user', ['post.create'])
    await role('migration-owner', [], true)

    await up(noop)

    expect(await permissionsOf('migration-user')).toEqual(['post.create'])
    expect(await permissionsOf('migration-owner')).toEqual([])
  })

  it('is idempotent', async () => {
    await role('migration-admin', ['role.manage', 'videoCall.create_closed'])
    await up(noop)
    const once = await permissionsOf('migration-admin')

    await up(noop)

    expect(await permissionsOf('migration-admin')).toEqual(once)
  })

  it('goes back by taking exactly what it added', async () => {
    await role('migration-admin', ['role.manage', 'videoCall.create_public'])
    await up(noop)

    await down(noop)

    expect(await permissionsOf('migration-admin')).toEqual([
      'role.manage',
      'videoCall.create_public',
    ])
  })
})
