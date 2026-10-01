import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { seedRolesForGroupsWithoutRoles, seedRolesForNewGroup } from './repository'
import { NONE_ROLE, OWNER_ROLE } from './types'

import type { RoleSeedTransaction } from './repository'

// A transaction that answers the template-copy statement with the given role names and
// records every statement it was handed. The structural transaction type is what makes this
// possible without a database — and the fallback below is the part worth testing, because a
// test database has no templates at all.
const fakeTransaction = (copiedNames: string[], storedNonMemberPermissions?: string) => {
  const runs: Array<{ query: string; parameters?: Record<string, unknown> }> = []
  const run = vi.fn(async (query: string, parameters?: Record<string, unknown>) => {
    runs.push({ query, parameters })
    // Two statements return something: the template copy, and the read-back of the seeded
    // `none` role that the derived non-member columns are computed from.
    if (query.includes('GroupRoleTemplate')) {
      return Promise.resolve({ records: [{ get: () => copiedNames }] })
    }
    if (query.includes('RETURN r.permissions AS permissions')) {
      return Promise.resolve({ records: [{ get: () => storedNonMemberPermissions ?? null }] })
    }
    return Promise.resolve({ records: [] })
  })
  return { transaction: { run } satisfies RoleSeedTransaction, runs }
}

// The statements that keep the derived non-member columns in step (see ./nonMemberAccess.ts).
const accessRuns = (runs: Array<{ query: string }>) =>
  runs.filter(
    (statement) =>
      statement.query.includes('RETURN r.permissions AS permissions') ||
      statement.query.includes('SET g.nonMemberRead'),
  )

const NOW = '2026-09-30T10:00:00.000Z'

describe(seedRolesForNewGroup, () => {
  it('copies the stored template when there is one', async () => {
    const { transaction, runs } = fakeTransaction(['none', 'pending', 'usual', 'admin', 'owner'])

    await seedRolesForNewGroup(transaction, 'group-1', 'closed', NOW)

    // One statement writes the roles: the copy. An operator who edited the templates gets what
    // they edited, without this code knowing what that was.
    expect(runs[0].query).toContain('GroupRoleTemplate')
    expect(runs[0].parameters).toEqual({ groupId: 'group-1', groupType: 'closed', now: NOW })
    // The rest is the derived columns, IN THE SAME TRANSACTION — a group whose roles exist
    // while its columns do not would be missing from the list it belongs in.
    expect(accessRuns(runs)).toHaveLength(2)
  })

  it('derives the non-member columns from the role it just seeded', async () => {
    const { transaction, runs } = fakeTransaction(
      ['none', 'pending', 'usual', 'admin', 'owner'],
      '["group.read","group.members.read"]',
    )

    await seedRolesForNewGroup(transaction, 'group-1', 'closed', NOW)

    const write = runs.find((statement) => statement.query.includes('SET g.nonMemberRead'))

    expect(write?.parameters).toEqual({
      groupId: 'group-1',
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: true,
    })
  })

  it('falls back to the code defaults when no template exists', async () => {
    // The state after cleanDatabase(): without the fallback, every group created in a test
    // would have no roles and nobody could do anything in it.
    const { transaction, runs } = fakeTransaction([])

    await seedRolesForNewGroup(transaction, 'group-2', 'public', NOW)

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

// The boot repair. A fake db context rather than a database: what matters is which groups it
// picks up and which statements it sends for each, and both are visible here.
const fakeDatabase = (groups: Array<{ groupId: string; groupType: string }>) => {
  const statements: Array<{ query: string; variables?: Record<string, unknown> }> = []
  const rowsFor = (query: string) => {
    // The template copy answers with the names it copied; an empty list sends the caller to
    // the code defaults. The permission read-back feeds the derived columns.
    if (query.includes('GroupRoleTemplate')) {
      return [{ get: () => [NONE_ROLE] }]
    }
    if (query.includes('RETURN r.permissions AS permissions')) {
      return [{ get: () => '["group.read"]' }]
    }
    return []
  }
  return {
    statements,
    db: {
      query: vi.fn(async ({ query }: { query: string }) => {
        statements.push({ query })
        return Promise.resolve({
          records: query.includes('NOT (g)-[:HAS_GROUP_ROLE]')
            ? groups.map((group) => ({
                get: (key: string) => group[key as 'groupId'],
              }))
            : rowsFor(query),
        })
      }),
      write: vi.fn(
        async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
          statements.push({ query, variables })
          return Promise.resolve({ records: rowsFor(query) })
        },
      ),
    },
  }
}

describe(seedRolesForGroupsWithoutRoles, () => {
  it('does nothing when every group has its roles', async () => {
    const { db, statements } = fakeDatabase([])

    expect(await seedRolesForGroupsWithoutRoles(db as never, NOW)).toEqual({
      seeded: [],
      skipped: [],
    })
    // One statement: the scan that found nothing.
    expect(statements).toHaveLength(1)
  })

  it('seeds the template of its type for every group that has none', async () => {
    const { db, statements } = fakeDatabase([
      { groupId: 'older-group', groupType: 'closed' },
      { groupId: 'restored-group', groupType: 'public' },
    ])

    expect(await seedRolesForGroupsWithoutRoles(db as never, NOW)).toEqual({
      seeded: ['older-group', 'restored-group'],
      skipped: [],
    })

    const copies = statements.filter((statement) => statement.query.includes('GroupRoleTemplate'))

    expect(copies.map((statement) => statement.variables?.groupType)).toEqual(['closed', 'public'])
  })

  it('reports a group whose type has no template instead of throwing', async () => {
    // One odd row must not stop a deployment: the group is left exactly as it was, and named
    // so an operator can look at it.
    const { db } = fakeDatabase([
      { groupId: 'odd-group', groupType: 'experimental' },
      { groupId: 'normal-group', groupType: 'public' },
    ])

    expect(await seedRolesForGroupsWithoutRoles(db as never, NOW)).toEqual({
      seeded: ['normal-group'],
      skipped: ['odd-group'],
    })
  })
})
