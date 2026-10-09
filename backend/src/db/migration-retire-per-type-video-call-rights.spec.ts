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

  it('goes back by deriving the per-type keys from their successors', async () => {
    await role('retire-caller', ['videoCall.create_open', 'videoCall.create_restricted'])

    await down(noop)

    expect(await permissionsOf('retire-caller')).toEqual([
      'videoCall.create_open',
      'videoCall.create_restricted',
      'videoCall.create_public',
      'videoCall.create_closed',
      'videoCall.create_hidden',
    ])
  })
})
