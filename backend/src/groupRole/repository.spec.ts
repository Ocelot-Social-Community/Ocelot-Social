import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import {
  applyGroupTypeToNonMemberRoles,
  deleteGroupRole,
  markGroupRolesCustomized,
  memberCountsByRole,
  readGroupRoles,
  readGroupRoleTemplates,
  renameGroupRole,
  replaceGroupRoles,
  seedGroupRoleTemplate,
  seedRolesForGroupsWithoutRoles,
  seedRolesForNewGroup,
  setNonMemberMemberListAccess,
  syncNonMemberAccess,
  untouchedGroupIdsByType,
  writeGroupRole,
  writeGroupRoleTemplate,
} from './repository'
import { NONE_ROLE, OWNER_ROLE } from './types'

import type { RoleSeedTransaction } from './repository'
import type { GroupRoleDefinition } from './types'

// syncNonMemberAccess takes the runner the seeding path speaks, which a db context satisfies
// through this one adapter — the same one the repository uses internally.
const runnerForTest = (db: never) => ({
  run: async (query: string, variables?: Record<string, unknown>) =>
    (db as unknown as { write: (args: unknown) => Promise<{ records: [] }> }).write({
      query,
      variables: variables ?? {},
    }),
})

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
      // The door the video call cap reads (./callDoor.ts): this role may ASK to join.
      nonMemberJoin: false,
      // Derived from the same two rights, in the same statement: a readable profile with
      // private content IS a closed group (see ./privacyLevel.ts).
      groupType: 'closed',
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

  it('falls back to the code defaults when the copy statement answers nothing at all', async () => {
    // An empty result rather than a row with an empty list: the same situation (no templates),
    // reached when the MATCH finds no template node to collect from.
    const runs: Array<{ query: string; parameters?: Record<string, unknown> }> = []
    const transaction = {
      run: vi.fn(async (query: string, parameters?: Record<string, unknown>) => {
        runs.push({ query, parameters })
        return Promise.resolve({ records: [] })
      }),
    }

    await seedRolesForNewGroup(transaction, 'group-4', 'public', NOW)

    expect(runs[1].query).toContain('UNWIND $roles AS role')
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

// One fake db context for the thin Cypher wrappers below. They are thin on purpose — the
// interesting part of each is WHICH statement it sends and with which variables, because that
// is where an invariant lives (a rename that forgets the memberships, a role write that forgets
// the derived columns). A fake shows exactly that, and shows it without a database.
const roleRecord = (values: Record<string, unknown>) => ({
  get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, literal keys
})

const fakeDb = (
  records: (statement: string) => Array<ReturnType<typeof roleRecord>> = () => [],
) => {
  const sent: Array<{ query: string; variables?: Record<string, unknown> }> = []
  const answer = async ({
    query,
    variables,
  }: {
    query: string
    variables?: Record<string, unknown>
  }) => {
    sent.push({ query, variables })
    return Promise.resolve({ records: records(query) })
  }
  return { sent, db: { query: vi.fn(answer), write: vi.fn(answer) } as never }
}

const storedRole = (name: string, permissions: string[], overrides = {}) =>
  roleRecord({
    name,
    label: null,
    system: true,
    protected: false,
    permissions: JSON.stringify(permissions),
    ...overrides,
  })

const definition = (name: string, permissions: GroupRoleDefinition['permissions']) => ({
  name,
  label: null,
  system: false,
  protected: false,
  permissions,
})

describe(readGroupRoles, () => {
  it('maps the stored rows onto definitions', async () => {
    const { db, sent } = fakeDb(() => [
      storedRole('none', ['group.read']),
      storedRole('owner', [], { protected: true, label: 'Boss' }),
    ])

    expect(await readGroupRoles(db, 'g1')).toEqual([
      { name: 'none', label: null, system: true, protected: false, permissions: ['group.read'] },
      { name: 'owner', label: 'Boss', system: true, protected: true, permissions: [] },
    ])
    expect(sent[0].variables).toEqual({ groupId: 'g1' })
  })
})

describe('a stored row with nothing in its optional columns', () => {
  it('reads as no label and no permissions', async () => {
    // Both columns are optional on the node: a role seeded before `label` existed has neither,
    // and `permissions` is absent on a role whose list was never written.
    const { db } = fakeDb(() => [roleRecord({ name: 'none' })])

    expect(await readGroupRoles(db, 'g1')).toEqual([
      { name: 'none', label: null, system: false, protected: false, permissions: [] },
    ])
  })
})

describe(readGroupRoleTemplates, () => {
  it('groups the templates by group type', async () => {
    const { db } = fakeDb(() => [
      roleRecord({ groupType: 'public', name: 'none', permissions: '["group.read"]' }),
      roleRecord({ groupType: 'public', name: 'usual', permissions: '[]' }),
      roleRecord({ groupType: 'hidden', name: 'none', permissions: '[]' }),
    ])

    const templates = await readGroupRoleTemplates(db)

    expect(Object.keys(templates)).toEqual(['public', 'hidden'])
    expect(templates.public.map((role) => role.name)).toEqual(['none', 'usual'])
  })
})

describe(seedGroupRoleTemplate, () => {
  it('writes one template role under <groupType>:<name>, ON CREATE only', async () => {
    const { db, sent } = fakeDb()

    await seedGroupRoleTemplate(db, 'closed', definition('usual', ['group.read']), NOW)

    expect(sent[0].query).toContain('ON CREATE SET')
    expect(sent[0].query).not.toContain('\n            SET ')
    expect(sent[0].variables).toMatchObject({
      id: 'closed:usual',
      groupType: 'closed',
      name: 'usual',
      permissions: '["group.read"]',
    })
  })
})

describe(writeGroupRoleTemplate, () => {
  it('writes a template role an operator edited, overwriting what is there', async () => {
    const { db, sent } = fakeDb()

    await writeGroupRoleTemplate(db, 'public', definition('admin', ['group.invite']), 'editor', NOW)

    expect(sent[0].variables).toMatchObject({
      id: 'public:admin',
      groupType: 'public',
      name: 'admin',
      permissions: '["group.invite"]',
      actor: 'editor',
    })
  })
})

describe(syncNonMemberAccess, () => {
  it('mirrors the non-member role onto the group`s columns', async () => {
    const { db, sent } = fakeDb((query) =>
      query.includes('RETURN r.permissions AS permissions')
        ? [roleRecord({ permissions: '["group.read","group.members.read"]' })]
        : [],
    )

    await syncNonMemberAccess(runnerForTest(db), 'g1')

    const write = sent.find((statement) => statement.query.includes('SET g.nonMemberRead'))

    expect(write?.variables).toEqual({
      groupId: 'g1',
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: true,
      nonMemberJoin: false,
      groupType: 'closed',
    })
  })

  it('writes nothing for a group with no non-member role', async () => {
    // Writing "nothing is open to strangers" here would hide an unseeded public group from
    // everybody; the queries' coalesce fallback is the better answer until the roles exist.
    const { db, sent } = fakeDb(() => [])

    await syncNonMemberAccess(runnerForTest(db), 'g1')

    expect(sent.filter((statement) => statement.query.includes('SET g.nonMemberRead'))).toEqual([])
  })
})

describe(memberCountsByRole, () => {
  it('reads the counts as numbers', async () => {
    const { db } = fakeDb(() => [
      roleRecord({ roleName: 'usual', count: '12' }),
      roleRecord({ roleName: 'owner', count: '1' }),
    ])

    expect([...(await memberCountsByRole(db, 'g1'))]).toEqual([
      ['usual', 12],
      ['owner', 1],
    ])
  })
})

describe(writeGroupRole, () => {
  it('writes the role and, for `none`, the derived columns with it', async () => {
    const { db, sent } = fakeDb((query) =>
      query.includes('RETURN r.permissions AS permissions')
        ? [roleRecord({ permissions: '["group.read"]' })]
        : [],
    )

    await writeGroupRole(db, 'g1', definition('none', ['group.read']), 'editor', NOW)

    expect(sent[0].variables).toMatchObject({ groupId: 'g1', name: 'none', actor: 'editor' })
    expect(sent.some((statement) => statement.query.includes('SET g.nonMemberRead'))).toBe(true)
  })

  it('leaves the columns alone for any other role', async () => {
    const { db, sent } = fakeDb()

    await writeGroupRole(db, 'g1', definition('admin', ['group.invite']), 'editor', NOW)

    expect(sent).toHaveLength(1)
  })
})

describe(renameGroupRole, () => {
  it('moves the memberships with the role', async () => {
    // A membership names its role by STRING, so a rename that forgot the edges would turn every
    // member of that role into somebody holding a role that does not exist.
    const { db, sent } = fakeDb()

    await renameGroupRole(db, 'g1', 'admin', 'steward', 'editor', NOW)

    expect(sent[0].query).toContain('SET m.role = $newName')
    expect(sent[0].variables).toMatchObject({ oldName: 'admin', newName: 'steward' })
  })
})

describe(deleteGroupRole, () => {
  it('reassigns the members before deleting the role', async () => {
    const { db, sent } = fakeDb()

    await deleteGroupRole(db, 'g1', 'steward', 'usual', NOW)

    expect(sent[0].query).toContain('SET m.role = $reassignTo')
    expect(sent[0].query).toContain('DETACH DELETE r')
    expect(sent[0].variables).toMatchObject({ name: 'steward', reassignTo: 'usual' })
  })
})

describe(replaceGroupRoles, () => {
  it('drops what the new set does not have and writes the rest', async () => {
    const { db, sent } = fakeDb()

    await replaceGroupRoles(
      db,
      'g1',
      [definition('none', []), definition('usual', ['group.read'])],
      'usual',
      'editor',
      NOW,
    )

    expect(sent[0].query).toContain('WHERE NOT r.name IN $keep')
    expect(sent[0].variables).toMatchObject({ keep: ['none', 'usual'], fallbackRoleName: 'usual' })
    expect(
      sent.filter((statement) => statement.query.includes('MERGE (g)-[:HAS_GROUP_ROLE]')),
    ).toHaveLength(2)
  })
})

describe(applyGroupTypeToNonMemberRoles, () => {
  it('writes the type`s template into `none` and `pending`, keeping their labels', async () => {
    const { db, sent } = fakeDb((query) =>
      query.includes('ORDER BY r.name ASC')
        ? [storedRole('none', [], { label: 'Visitors' }), storedRole('pending', [])]
        : [],
    )

    await applyGroupTypeToNonMemberRoles(db, 'g1', 'closed', 'editor', NOW)

    const written = sent.filter((statement) =>
      statement.query.includes('MERGE (g)-[:HAS_GROUP_ROLE]'),
    )

    expect(written.map((statement) => statement.variables?.name)).toEqual(['none', 'pending'])
    expect(written[0].variables).toMatchObject({ label: 'Visitors' })
    // The closed template's non-member role may ask to join, not enter.
    expect(written[0].variables?.permissions).toContain('group.join.request')
  })

  it('leaves the roles alone for a group type it has no template for', async () => {
    const { db, sent } = fakeDb()

    await applyGroupTypeToNonMemberRoles(db, 'g1', 'experimental', 'editor', NOW)

    expect(sent).toEqual([])
  })
})

describe(markGroupRolesCustomized, () => {
  it('records only the FIRST edit', async () => {
    // The timestamp is what "apply the template to groups that never touched their roles"
    // selects by, so it must not move every time somebody flips a checkbox.
    const { db, sent } = fakeDb()

    await markGroupRolesCustomized(db, 'g1', NOW)

    expect(sent[0].query).toContain('WHERE g.rolesCustomizedAt IS NULL')
  })
})

describe(setNonMemberMemberListAccess, () => {
  const withNoneHolding = (permissions: string[]) =>
    fakeDb((query) =>
      query.includes('ORDER BY r.name ASC')
        ? [storedRole('none', permissions)]
        : query.includes('RETURN r.permissions AS permissions')
          ? [roleRecord({ permissions: JSON.stringify(permissions) })]
          : [],
    )

  it('adds the right when the setting is switched on', async () => {
    const { db, sent } = withNoneHolding(['group.read'])

    await setNonMemberMemberListAccess(db, 'g1', true, NOW)

    const write = sent.find((statement) => statement.query.includes("r:GroupRole {name: 'none'}"))

    expect(write?.variables?.permissions).toContain('group.members.read')
  })

  it('removes it when the setting is switched off', async () => {
    const { db, sent } = withNoneHolding(['group.read', 'group.members.read'])

    await setNonMemberMemberListAccess(db, 'g1', false, NOW)

    const write = sent.find((statement) => statement.query.includes("r:GroupRole {name: 'none'}"))

    expect(write?.variables?.permissions).not.toContain('group.members.read')
  })

  it('writes nothing when the role already says what the setting says', async () => {
    const { db, sent } = withNoneHolding(['group.members.read'])

    await setNonMemberMemberListAccess(db, 'g1', true, NOW)

    expect(sent.filter((statement) => statement.query.includes('SET r.permissions'))).toEqual([])
  })

  it('writes nothing for a group with no non-member role', async () => {
    const { db, sent } = fakeDb(() => [])

    await setNonMemberMemberListAccess(db, 'g1', true, NOW)

    expect(sent).toHaveLength(1)
  })
})

describe(untouchedGroupIdsByType, () => {
  it('groups the untouched group ids by type, with the total beside them', async () => {
    // One statement answers both: an apply reaches the untouched ones, and the UI needs the
    // total to say "4 of 7" instead of a bare "4" that reads as "only 4".
    const { db, sent } = fakeDb(() => [
      roleRecord({ groupType: 'public', ids: ['a', 'b'], total: '5' }),
      roleRecord({ groupType: 'hidden', ids: ['c'], total: '1' }),
    ])

    expect([...(await untouchedGroupIdsByType(db))]).toEqual([
      ['public', { untouchedIds: ['a', 'b'], total: 5 }],
      ['hidden', { untouchedIds: ['c'], total: 1 }],
    ])
    expect(sent[0].query).toContain('g.rolesCustomizedAt IS NULL')
  })

  it('drops the nulls a customised group leaves in the collect', async () => {
    // `collect(CASE WHEN … THEN g.id END)` keeps one null per non-matching row, and a null in
    // that list would become a group id an apply then tries to write to.
    const { db } = fakeDb(() => [roleRecord({ groupType: 'public', ids: ['a', null], total: '2' })])

    expect([...(await untouchedGroupIdsByType(db))]).toEqual([
      ['public', { untouchedIds: ['a'], total: 2 }],
    ])
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
