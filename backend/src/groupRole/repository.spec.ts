import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { seedRolesForNewGroup } from './repository'
import { NONE_ROLE, OWNER_ROLE } from './types'

import type { RoleSeedTransaction } from './repository'

// A transaction that answers the template-copy statement with the given role names and
// records every statement it was handed. The structural transaction type is what makes this
// possible without a database — and the fallback below is the part worth testing, because a
// test database has no templates at all.
const fakeTransaction = (copiedNames: string[]) => {
  const runs: Array<{ query: string; parameters?: Record<string, unknown> }> = []
  const run = vi.fn(async (query: string, parameters?: Record<string, unknown>) => {
    runs.push({ query, parameters })
    // The copy statement is the one that returns something.
    return Promise.resolve(
      query.includes('GroupRoleTemplate')
        ? { records: [{ get: () => copiedNames }] }
        : { records: [] },
    )
  })
  return { transaction: { run } satisfies RoleSeedTransaction, runs }
}

const NOW = '2026-09-30T10:00:00.000Z'

describe(seedRolesForNewGroup, () => {
  it('copies the stored template when there is one', async () => {
    const { transaction, runs } = fakeTransaction(['none', 'pending', 'usual', 'admin', 'owner'])

    await seedRolesForNewGroup(transaction, 'group-1', 'closed', NOW)

    // One statement only: the copy. An operator who edited the templates gets what they
    // edited, without this code knowing what that was.
    expect(runs).toHaveLength(1)
    expect(runs[0].query).toContain('GroupRoleTemplate')
    expect(runs[0].parameters).toEqual({ groupId: 'group-1', groupType: 'closed', now: NOW })
  })

  it('falls back to the code defaults when no template exists', async () => {
    // The state after cleanDatabase(): without the fallback, every group created in a test
    // would have no roles and nobody could do anything in it.
    const { transaction, runs } = fakeTransaction([])

    await seedRolesForNewGroup(transaction, 'group-2', 'public', NOW)

    expect(runs).toHaveLength(2)
    expect(runs[1].query).toContain('UNWIND $roles AS role')

    const roles = runs[1].parameters?.roles as Array<{ name: string; permissions: string }>

    expect(roles.map((role) => role.name)).toEqual(
      DEFAULT_GROUP_ROLE_TEMPLATES.public.map((role) => role.name),
    )
    // Serialised exactly as the repository stores it elsewhere: a JSON list, not a Neo4j one.
    expect(JSON.parse(roles[0].permissions)).toEqual(
      DEFAULT_GROUP_ROLE_TEMPLATES.public.find((role) => role.name === NONE_ROLE)?.permissions,
    )
    // owner keeps its empty list, which is what makes it resolve to the whole catalog.
    expect(
      JSON.parse(roles.find((role) => role.name === OWNER_ROLE)?.permissions ?? 'null'),
    ).toEqual([])
  })

  it('refuses a group type that has no template at all', async () => {
    // Unreachable through the API, since groupType comes from the GraphQL enum. It throws
    // rather than skipping so a fourth group type surfaces here and not as a group whose
    // members have no rights.
    const { transaction } = fakeTransaction([])

    await expect(seedRolesForNewGroup(transaction, 'group-3', 'ephemeral', NOW)).rejects.toThrow(
      "No group role template for groupType 'ephemeral'",
    )
  })
})
