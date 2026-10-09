import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { down, up } from './migrations/20261008120000-retire-per-type-video-call-rights'

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

const retiredOf = async (id: string): Promise<string[] | null> => {
  const result = await run(
    `MATCH (r:Role {id: $id}) RETURN r.retiredVideoCallPermissions AS retired`,
    { id },
  )
  const retired = result.records[0].get('retired') as string | null
  return retired === null ? null : (JSON.parse(retired) as string[])
}

const role = async (id: string, permissions: string[], isProtected = false) =>
  run(`CREATE (:Role {id: $id, protected: $isProtected, permissions: $permissions})`, {
    id,
    isProtected,
    permissions: JSON.stringify(permissions),
  })

describe('migration: retire-per-type-video-call-rights', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('removes the per-type keys and keeps their per-door successors', async () => {
    await role('retire-caller', [
      'post.create',
      'videoCall.create_public',
      'videoCall.create_open',
      'videoCall.create_hidden',
      'videoCall.create_restricted',
    ])

    await up(noop)

    expect(await permissionsOf('retire-caller')).toEqual([
      'post.create',
      'videoCall.create_open',
      'videoCall.create_restricted',
    ])
  })

  it('leaves a protected role alone, and is idempotent', async () => {
    await role('retire-owner', ['videoCall.create_public'], true)
    await role('retire-user', ['post.create'])

    await up(noop)
    await up(noop)

    expect(await permissionsOf('retire-owner')).toEqual(['videoCall.create_public'])
    expect(await permissionsOf('retire-user')).toEqual(['post.create'])
  })

  it('remembers on the role which per-type keys it took', async () => {
    await role('retire-caller', ['videoCall.create_open', 'videoCall.create_public'])
    await role('retire-user', ['post.create'])

    await up(noop)
    await up(noop)

    expect(await retiredOf('retire-caller')).toEqual(['videoCall.create_public'])
    expect(await retiredOf('retire-user')).toEqual([])
  })

  it('goes back to exactly the keys it took, not to every type a successor covers', async () => {
    // Only closed calls before: restricted alone cannot say so, the record can.
    await role('retire-caller', ['videoCall.create_restricted', 'videoCall.create_closed'])
    await up(noop)

    await down(noop)

    expect(await permissionsOf('retire-caller')).toEqual([
      'videoCall.create_restricted',
      'videoCall.create_closed',
    ])
    expect(await retiredOf('retire-caller')).toBeNull()
  })

  it('does not bring back a key whose successor was taken away since', async () => {
    await role('retire-caller', ['videoCall.create_restricted', 'videoCall.create_hidden'])
    await up(noop)
    await run(`MATCH (r:Role {id: 'retire-caller'}) SET r.permissions = '[]'`)

    await down(noop)

    expect(await permissionsOf('retire-caller')).toEqual([])
  })

  it('brings back nothing for a role that held no per-type key when it went forward', async () => {
    // _open without _public: given by hand after 20261004110000. The empty record keeps the
    // fallback for unseen roles from granting it _public on the way back.
    await role('retire-caller', ['videoCall.create_open'])
    await up(noop)

    await down(noop)

    expect(await permissionsOf('retire-caller')).toEqual(['videoCall.create_open'])
    expect(await retiredOf('retire-caller')).toBeNull()
  })

  it('derives only the unambiguous key for a role created after the way forward', async () => {
    await role('retire-caller', ['videoCall.create_open', 'videoCall.create_restricted'])

    await down(noop)

    expect(await permissionsOf('retire-caller')).toEqual([
      'videoCall.create_open',
      'videoCall.create_restricted',
      'videoCall.create_public',
    ])
  })
})
