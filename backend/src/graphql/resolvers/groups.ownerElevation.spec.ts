/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import elevateInGroup from '@graphql/queries/groups/elevateInGroup.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'
import type { RoleDefinition } from '@src/role'

// A network admin who is also an owner of the group (#10481).
//
// Inside the group owners are peers: none of them may act on another. What puts somebody above
// every member is an elevation that rests on `group.administer.any_<visibility>` — and a network
// admin who happens to own the group was never offered one, because their membership already
// holds every right. So a network admin who was NOT in the group could demote a co-owner, and
// one who was could not.
//
// Against a real database: the offer, the elevation and the act-on rule all take part.

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
let rolesOverride: RoleDefinition[] | undefined
const context = () => ({ authenticatedUser, policy, roles: rolesOverride })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const offer = parse(`
  query ($id: ID!) {
    Group(id: $id) {
      id
      mayElevateInGroup
    }
  }
`)

const setGroupMemberRole = parse(`
  mutation ($groupId: ID!, $userId: ID!, $roleName: String!) {
    setGroupMemberRole(groupId: $groupId, userId: $userId, roleName: $roleName) {
      membership {
        role
      }
    }
  }
`)

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

let networkAdmin

const roleOf = async (userId: string): Promise<string | undefined> => {
  const { records } = await database.query({
    query: `MATCH (:User {id: $userId})-[m:MEMBER_OF]->(:Group {id: 'closed-group'})
            RETURN m.role AS role`,
    variables: { userId },
  })
  return records[0]?.get('role') as string | undefined
}

// The rights the way a role carries them; the viewer's group role comes from their membership.
const withNetworkRights = (...permissions: PermissionKey[]) => {
  rolesOverride = [{ name: 'user', protected: false, permissions }]
}

const isOffered = async (): Promise<boolean> => {
  const { data, errors } = await query({ query: offer, variables: { id: 'closed-group' } })

  expect(errors?.[0]?.message).toBeUndefined()

  return data?.Group?.[0]?.mayElevateInGroup as boolean
}

const demoteCoOwner = async () =>
  mutate({
    mutation: setGroupMemberRole,
    variables: { groupId: 'closed-group', userId: 'co-owner', roleName: 'usual' },
  })

beforeEach(async () => {
  await cleanDatabase()
  rolesOverride = undefined
  networkAdmin = await Factory.build(
    'user',
    { id: 'network-admin', name: 'Network Admin' },
    { email: 'network-admin@example.org', password: '1234' },
  )
  await Factory.build(
    'user',
    { id: 'co-owner', name: 'Co Owner' },
    { email: 'co-owner@example.org', password: '1234' },
  )
  authenticatedUser = await networkAdmin.toJson()
  const { errors } = await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'closed-group',
      name: 'Closed Group',
      about: 'About',
      description: 'A sufficiently long description ' + '-'.repeat(100),
      actionRadius: 'global',
      template: 'closed',
      categoryIds: null,
    },
  })
  if (errors) {
    throw new Error(errors[0].message)
  }
  await database.write({
    query: `MATCH (user:User {id: 'co-owner'}), (group:Group {id: 'closed-group'})
            MERGE (user)-[m:MEMBER_OF]->(group)
            SET m.role = 'owner', m.createdAt = toString(datetime())`,
  })
})

describe('an owner who administers groups of this kind by network', () => {
  beforeEach(() => {
    withNetworkRights('group.administer.any_closed')
  })

  it('is offered the elevation', async () => {
    expect(await isOffered()).toBe(true)
  })

  it('may not demote a co-owner without it', async () => {
    const { errors } = await demoteCoOwner()

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    expect(await roleOf('co-owner')).toBe('owner')
  })

  it('demotes a co-owner once elevated', async () => {
    const { errors } = await mutate({
      mutation: elevateInGroup,
      variables: { groupId: 'closed-group', reason: 'Co-owner left the network' },
    })

    expect(errors?.[0]?.message).toBeUndefined()

    const demoted = await demoteCoOwner()

    expect(demoted.errors?.[0]?.message).toBeUndefined()
    expect(await roleOf('co-owner')).toBe('usual')
  })
})

describe('an owner whose network rights do not administer', () => {
  it('is offered nothing', async () => {
    withNetworkRights('group.moderate.any_closed')

    expect(await isOffered()).toBe(false)
  })

  it('may not elevate either', async () => {
    withNetworkRights('group.moderate.any_closed')

    const { errors } = await mutate({
      mutation: elevateInGroup,
      variables: { groupId: 'closed-group', reason: 'Trying anyway' },
    })

    expect(errors?.[0]?.message).toBeDefined()
  })
})
