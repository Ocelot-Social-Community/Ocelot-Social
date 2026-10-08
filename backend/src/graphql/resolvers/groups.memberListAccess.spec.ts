/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import GroupMembers from '@graphql/queries/groups/GroupMembers.gql'
import UpdateGroup from '@graphql/queries/groups/UpdateGroup.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// The member list of a group, as the deprecated `showMembers` argument of UpdateGroup reaches it.
//
// That argument writes `group.members.read` onto the group's non-member role. It used to need
// only `group.settings.manage` — which admins hold and `group.role.manage` they do not — and it
// would write the right onto a HIDDEN group too, where it stood without `group.read`; and
// GroupMembers asked for `group.members.read` alone. So an admin could change a right without
// the right to change rights, and the members of a hidden group were readable by anybody who
// knew its id.
//
// Against a real database: the shield, the resolver and the stored role all take part.

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
let rolesOverride: RoleDefinition[] | undefined
const context = () => ({ authenticatedUser, policy, roles: rolesOverride })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const nonMemberRights = async (groupId: string): Promise<string[]> => {
  const { records } = await database.query({
    query: `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(role:GroupRole {name: 'none'})
            RETURN role.permissions AS permissions`,
    variables: { groupId },
  })
  return JSON.parse((records[0]?.get('permissions') as string | undefined) ?? '[]') as string[]
}

const setNonMemberRights = async (groupId: string, permissions: string[]): Promise<void> => {
  await database.write({
    query: `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(role:GroupRole {name: 'none'})
            SET role.permissions = $permissions`,
    variables: { groupId, permissions: JSON.stringify(permissions) },
  })
}

const setMembership = async (userId: string, groupId: string, role: string): Promise<void> => {
  await database.write({
    query: `MATCH (user:User {id: $userId}), (group:Group {id: $groupId})
            MERGE (user)-[m:MEMBER_OF]->(group)
            SET m.role = $role, m.createdAt = toString(datetime())`,
    variables: { userId, groupId, role },
  })
}

const createGroup = async (id: string, template: string): Promise<void> => {
  await mutate({
    mutation: CreateGroup,
    variables: {
      id,
      name: `Group ${id}`,
      about: 'About',
      description: 'A sufficiently long description ' + '-'.repeat(100),
      actionRadius: 'global',
      template,
      categoryIds: null,
    },
  })
}

beforeAll(async () => {
  await cleanDatabase()
  const setup = await createApolloTestSetup({ context })
  mutate = setup.mutate
  query = setup.query
  database = setup.database
  server = setup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

let owner
let admin
let stranger

beforeEach(async () => {
  await cleanDatabase()
  rolesOverride = undefined
  owner = await Factory.build(
    'user',
    { id: 'group-owner', name: 'Group Owner' },
    { email: 'group-owner@example.org', password: '1234' },
  )
  admin = await Factory.build(
    'user',
    { id: 'group-admin', name: 'Group Admin' },
    { email: 'group-admin@example.org', password: '1234' },
  )
  stranger = await Factory.build(
    'user',
    { id: 'stranger', name: 'Stranger' },
    { email: 'stranger@example.org', password: '1234' },
  )
  authenticatedUser = await owner.toJson()
  await createGroup('closed-group', 'closed')
  await createGroup('hidden-group', 'hidden')
  await setMembership('group-admin', 'closed-group', 'admin')
})

describe('opening the member list through UpdateGroup(showMembers)', () => {
  it('is refused to an admin, who may manage settings but not rights', async () => {
    authenticatedUser = await admin.toJson()

    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'closed-group', showMembers: true },
    })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    expect(await nonMemberRights('closed-group')).not.toContain('group.members.read')
  })

  it('still lets an admin save the value the group already has', async () => {
    // Older clients post every field of the form with every save.
    authenticatedUser = await admin.toJson()

    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'closed-group', name: 'Renamed', showMembers: false },
    })

    expect(errors).toBeUndefined()
    expect(errors?.[0]?.message).toBeUndefined()
  })

  it('is granted to the owner on a group outsiders can see', async () => {
    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'closed-group', showMembers: true },
    })

    expect(errors).toBeUndefined()
    expect(errors?.[0]?.message).toBeUndefined()
    expect(await nonMemberRights('closed-group')).toContain('group.members.read')
  })

  it('is refused on a hidden group, even to its owner', async () => {
    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'hidden-group', showMembers: true },
    })

    expect(errors?.[0]).toHaveProperty(
      'message',
      'A group outsiders cannot find has no member list to open.',
    )
    expect(await nonMemberRights('hidden-group')).not.toContain('group.members.read')
  })
})

describe('reading the member list of a hidden group', () => {
  it('stays closed to a stranger, even where the right was stored without group.read', async () => {
    // A list stored by hand, by a restore or by an older write path — not by the matrix, which
    // keeps the two rights together.
    await setNonMemberRights('hidden-group', ['group.members.read'])
    authenticatedUser = await stranger.toJson()

    const { errors } = await query({ query: GroupMembers, variables: { id: 'hidden-group' } })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })
})

// The deprecated argument the way the current webapp form sends it: on EVERY save, `false`
// included, and on create as well. It means what it always meant — whether a CLOSED group shows
// its members to outsiders — and must not reach any further than that.
describe('showMembers as the current form sends it', () => {
  const CreateGroupWithMemberList = parse(`
    mutation ($id: ID, $template: String, $showMembers: Boolean) {
      CreateGroup(
        id: $id
        name: "A group"
        description: "A sufficiently long description ------------------------------------------------------------------------------------------"
        actionRadius: global
        template: $template
        showMembers: $showMembers
      ) {
        id
        showMembers
      }
    }
  `)

  it('opens the list of a closed group created with it', async () => {
    const { data, errors } = await mutate({
      mutation: CreateGroupWithMemberList,
      variables: { id: 'open-closed', template: 'closed', showMembers: true },
    })

    expect(errors).toBeUndefined()
    expect(data?.CreateGroup).toEqual({ id: 'open-closed', showMembers: true })
    expect(await nonMemberRights('open-closed')).toContain('group.members.read')
  })

  it('refuses to open the list of a hidden group created with it', async () => {
    const { errors } = await mutate({
      mutation: CreateGroupWithMemberList,
      variables: { id: 'open-hidden', template: 'hidden', showMembers: true },
    })

    expect(errors?.[0]).toMatchObject({
      extensions: { errorCode: 'GROUP_SAVE_MEMBER_LIST_UNAVAILABLE' },
    })
  })

  it('does not close the list of a public group, at creation or on a later save', async () => {
    await mutate({
      mutation: CreateGroupWithMemberList,
      variables: { id: 'open-public', template: 'public', showMembers: false },
    })
    await setMembership('group-admin', 'open-public', 'admin')
    authenticatedUser = await admin.toJson()

    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'open-public', name: 'Renamed', showMembers: false },
    })

    expect(errors).toBeUndefined()
    expect(await nonMemberRights('open-public')).toContain('group.members.read')
  })

  it('reads null as no change', async () => {
    await setNonMemberRights('closed-group', ['group.read', 'group.members.read'])

    const { errors } = await mutate({
      mutation: UpdateGroup,
      variables: { id: 'closed-group', name: 'Renamed', showMembers: null },
    })

    expect(errors).toBeUndefined()
    expect(await nonMemberRights('closed-group')).toContain('group.members.read')
  })
})
