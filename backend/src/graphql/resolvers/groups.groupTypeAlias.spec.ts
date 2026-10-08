/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'
import { DEFAULT_ROLES } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// `groupType`, as the current webapp still sends and reads it (helpers/groupTypeAlias.ts). The
// documents are written out here rather than taken from queries/: those speak the new names, and
// what is under test is that the old ones keep working until the webapp has moved.

const CreateGroupByType = parse(`
  mutation ($id: ID, $name: String!, $description: String!, $groupType: GroupType, $actionRadius: GroupActionRadius!) {
    CreateGroup(id: $id, name: $name, description: $description, groupType: $groupType, actionRadius: $actionRadius) {
      id
      visibility
      groupType
      template
    }
  }
`)

const UpdateGroupByType = parse(`
  mutation ($id: ID!, $groupType: GroupType) {
    UpdateGroup(id: $id, groupType: $groupType) {
      id
      visibility
      groupType
    }
  }
`)

const ROLES_WITHOUT_CREATE_HIDDEN: RoleDefinition[] = DEFAULT_ROLES.map((role) =>
  role.name === 'user'
    ? { ...role, permissions: role.permissions.filter((p) => p !== 'group.create_hidden') }
    : role,
)

let authenticatedUser: Context['user']
const context = () => ({
  authenticatedUser,
  policy: { categoriesActive: false },
  roles: ROLES_WITHOUT_CREATE_HIDDEN,
})

let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const variables = {
  name: 'Old Client Group',
  description: 'A sufficiently long description ' + '-'.repeat(100),
  actionRadius: 'global',
}

const storedGroupType = async (id: string) =>
  (
    await database.query({
      query: `MATCH (g:Group {id: $id}) RETURN g.groupType AS groupType`,
      variables: { id },
    })
  ).records[0]?.get('groupType') as string | null

beforeAll(async () => {
  await cleanDatabase()
  const setup = await createApolloTestSetup({ context })
  mutate = setup.mutate
  database = setup.database
  server = setup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

let restrictedUser
let ownerUser

beforeEach(async () => {
  restrictedUser = await Factory.build(
    'user',
    { id: 'restricted-user', name: 'Restricted User' },
    { email: 'restricted@example.org', password: '1234' },
  )
  ownerUser = await Factory.build(
    'user',
    { id: 'owner-user', name: 'Owner User', role: 'owner' },
    { email: 'owner-user@example.org', password: '1234' },
  )
})

afterEach(async () => {
  await cleanDatabase()
})

describe('CreateGroup(groupType:)', () => {
  it('creates the group from the template of that name', async () => {
    authenticatedUser = await ownerUser.toJson()

    const { data, errors } = await mutate({
      mutation: CreateGroupByType,
      variables: { ...variables, id: 'by-type', groupType: 'closed' },
    })

    expect(errors).toBeUndefined()
    expect(data?.CreateGroup).toEqual({
      id: 'by-type',
      visibility: 'closed',
      groupType: 'closed',
      template: 'closed',
    })
  })

  it('does not bring the stored column back', async () => {
    // The resolvers write their remaining arguments onto the node; the alias must not be one.
    authenticatedUser = await ownerUser.toJson()
    await mutate({
      mutation: CreateGroupByType,
      variables: { ...variables, id: 'no-column', groupType: 'public' },
    })

    expect(await storedGroupType('no-column')).toBeNull()
  })

  it('costs what creating the group that way costs', async () => {
    // The alias is only a name: the cap on creating a hidden group applies through it as well.
    authenticatedUser = await restrictedUser.toJson()

    const { errors } = await mutate({
      mutation: CreateGroupByType,
      variables: { ...variables, id: 'hidden-by-type', groupType: 'hidden' },
    })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('needs one of the two names', async () => {
    authenticatedUser = await ownerUser.toJson()

    const { errors } = await mutate({
      mutation: CreateGroupByType,
      variables: { ...variables, id: 'nameless' },
    })

    expect(errors?.[0]).toHaveProperty('message', 'CreateGroup needs a template.')
  })
})

describe('UpdateGroup(groupType:)', () => {
  it('applies the visibility of that name, and stores no column for it', async () => {
    authenticatedUser = await ownerUser.toJson()
    await mutate({
      mutation: CreateGroupByType,
      variables: { ...variables, id: 'to-hide', groupType: 'public' },
    })

    const { data, errors } = await mutate({
      mutation: UpdateGroupByType,
      variables: { id: 'to-hide', groupType: 'hidden' },
    })

    expect(errors).toBeUndefined()
    expect(data?.UpdateGroup).toEqual({ id: 'to-hide', visibility: 'hidden', groupType: 'hidden' })
    expect(await storedGroupType('to-hide')).toBeNull()
  })
})
