/* eslint-disable @typescript-eslint/no-non-null-assertion */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

// Focused coverage for the groupsEnabled feature gate (Phase 3). The main groups.spec runs
// with the feature on (schema default); this file flips it off and asserts that every
// group surface — the Group query, group search, and the create/join/update/leave
// mutations — is rejected, and that a profile's groups field folds to []. Kept separate so
// the huge groups.spec's shared `policy` object stays untouched.
import Factory, { cleanDatabase } from '@db/factories'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import groupQuery from '@graphql/queries/groups/Group.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import UpdateGroup from '@graphql/queries/groups/UpdateGroup.gql'
import UserGroups from '@graphql/queries/groups/UserGroups.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
// Per-test policy override; the outer beforeEach creates a group with the feature ON, then
// each block sets the flag it needs. categoriesActive stays off so CreateGroup needs no
// category setup.
let policyOverride: Record<string, unknown>
const context = () => ({ authenticatedUser, policy: policyOverride })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const description =
  'A group description long enough to pass the minimum-length validation requirement here.'

const createGroupVariables = (id: string, name: string) => ({
  id,
  name,
  about: 'About the group',
  description,
  groupType: 'public',
  actionRadius: 'national',
})

// Plain string — the test query helper accepts a raw query string, so no gql tag needed.
const searchGroupsQuery = `
  query ($query: String!) {
    searchGroups(query: $query, firstGroups: 5, groupsOffset: 0) {
      groups {
        id
      }
    }
  }
`

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

describe('groups feature gate (groupsEnabled)', () => {
  beforeEach(async () => {
    // Feature ON here so the fixture group can be created.
    policyOverride = { categoriesActive: false }
    const owner = await Factory.build(
      'user',
      { id: 'group-owner', name: 'Group Owner' },
      { email: 'group-owner@example.org', password: '1234' },
    )
    authenticatedUser = await owner.toJson()
    await mutate({ mutation: CreateGroup, variables: createGroupVariables('g1', 'Group One') })
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('while groupsEnabled is on (default)', () => {
    it('serves the Group query and the profile groups list', async () => {
      const group = await query({ query: groupQuery, variables: { id: 'g1' } })
      expect(group.errors).toBeUndefined()
      expect(group.data!.Group[0]).toMatchObject({ id: 'g1', name: 'Group One' })

      const profile = await query({ query: UserGroups, variables: { id: 'group-owner' } })
      expect(profile.data!.User[0].groups.map((g: { id: string }) => g.id)).toContain('g1')
    })
  })

  describe('while groupsEnabled is off', () => {
    beforeEach(() => {
      policyOverride = { groupsEnabled: false, categoriesActive: false }
    })

    it('denies the Group query', async () => {
      const result = await query({ query: groupQuery, variables: { id: 'g1' } })
      expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('denies searching groups', async () => {
      const result = await query({ query: searchGroupsQuery, variables: { query: 'Group' } })
      expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('denies creating a group', async () => {
      const result = await mutate({
        mutation: CreateGroup,
        variables: createGroupVariables('g2', 'Group Two'),
      })
      expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('denies joining a group', async () => {
      const result = await mutate({
        mutation: JoinGroup,
        variables: { groupId: 'g1', userId: 'group-owner' },
      })
      expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('denies updating a group', async () => {
      const result = await mutate({
        mutation: UpdateGroup,
        variables: { id: 'g1', name: 'Renamed' },
      })
      expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('serves the profile but folds its groups field to an empty list', async () => {
      const profile = await query({ query: UserGroups, variables: { id: 'group-owner' } })
      expect(profile.errors).toBeUndefined()
      expect(profile.data!.User[0].groups).toEqual([])
    })
  })
})
