/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// An applicant whose group has since opened its door.
//
// Measured on a live instance before any of this existed: a public group anybody could walk
// into, with one person still waiting from when it was closed. Nobody needed to approve them
// any more, so no admin had a reason to look at the queue — and the seeded `pending` role gave
// them LESS than a stranger got. Two things fix it, and both are proven here rather than
// argued: the floor hands them what the group grants everybody (including `group.join`), and
// `JoinGroup` upgrades the membership they already have.
//
// Against a real database on purpose: what is under test is MERGE/ON MATCH semantics, which a
// fake driver cannot show.

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })

let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const roleOf = async (userId: string, groupId: string): Promise<string | null> => {
  const { records } = await database.query({
    query: `MATCH (:User {id: $userId})-[m:MEMBER_OF]->(:Group {id: $groupId}) RETURN m.role AS role`,
    variables: { userId, groupId },
  })
  return (records[0]?.get('role') as string | undefined) ?? null
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

let owner
let applicant

beforeEach(async () => {
  await cleanDatabase()
  owner = await Factory.build(
    'user',
    { id: 'group-owner', name: 'Group Owner' },
    { email: 'group-owner@example.org', password: '1234' },
  )
  applicant = await Factory.build(
    'user',
    { id: 'applicant', name: 'Applicant' },
    { email: 'applicant@example.org', password: '1234' },
  )
  authenticatedUser = await owner.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'the-group',
      name: 'The Group',
      about: 'About',
      description: 'A sufficiently long description ' + '-'.repeat(100),
      actionRadius: 'global',
      visibility: 'closed',
      categoryIds: null,
    },
  })
})

describe('an applicant in a group that has opened its door', () => {
  beforeEach(async () => {
    await setMembership('applicant', 'the-group', 'pending')
  })

  it('walks in themselves, instead of waiting for an approval nobody needs', async () => {
    // The group now lets any stranger join without approval.
    await setNonMemberRights('the-group', ['group.read', 'group.content.read', 'group.join'])
    authenticatedUser = await applicant.toJson()

    const { errors } = await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'the-group', userId: 'applicant' },
    })

    expect(errors).toBeUndefined()
    expect(await roleOf('applicant', 'the-group')).toBe('usual')
  })

  it('stays an applicant while the door is still shut', async () => {
    // Only `group.join.request` — the group does ask for approval, so nothing changes.
    await setNonMemberRights('the-group', ['group.read', 'group.join.request'])
    authenticatedUser = await applicant.toJson()

    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'the-group', userId: 'applicant' },
    })

    expect(await roleOf('applicant', 'the-group')).toBe('pending')
  })
})

describe('somebody who is already in the group', () => {
  it('is not demoted by a join that finds their membership', async () => {
    // The hazard in the ON MATCH clause: setting the role on every match would turn an admin
    // into an ordinary member the moment anybody ran JoinGroup against them.
    await setMembership('applicant', 'the-group', 'admin')
    await setNonMemberRights('the-group', ['group.read', 'group.content.read', 'group.join'])
    authenticatedUser = await applicant.toJson()

    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'the-group', userId: 'applicant' },
    })

    expect(await roleOf('applicant', 'the-group')).toBe('admin')
  })

  it('keeps the owner their group', async () => {
    await setNonMemberRights('the-group', ['group.read', 'group.content.read', 'group.join'])
    authenticatedUser = await owner.toJson()

    await mutate({
      mutation: JoinGroup,
      variables: { groupId: 'the-group', userId: 'group-owner' },
    })

    expect(await roleOf('group-owner', 'the-group')).toBe('owner')
  })
})
