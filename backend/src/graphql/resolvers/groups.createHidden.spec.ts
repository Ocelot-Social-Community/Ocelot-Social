/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Factory, { cleanDatabase } from '@db/factories'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import UpdateGroup from '@graphql/queries/groups/UpdateGroup.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { DEFAULT_ROLES } from '@src/role/index'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context/index'
import type { RoleDefinition } from '@src/role/index'

// The `user` baseline role with `group.create_hidden` revoked — models a network
// where the admin/owner did NOT distribute the "create hidden groups" capability.
// `owner` is untouched (special-cased to the full catalog), so an owner keeps it.
const ROLES_WITHOUT_CREATE_HIDDEN: RoleDefinition[] = DEFAULT_ROLES.map((role) =>
  role.name === 'user'
    ? { ...role, permissions: role.permissions.filter((p) => p !== 'group.create_hidden') }
    : role,
)

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy, roles: ROLES_WITHOUT_CREATE_HIDDEN })

let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const longDescription = 'A sufficiently long description ' + '-'.repeat(100)
const baseVariables = {
  name: 'Secret Group',
  about: 'About',
  description: longDescription,
  actionRadius: 'global',
  categoryIds: null,
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

let restrictedUser
let ownerUser

beforeEach(async () => {
  restrictedUser = await Factory.build(
    'user',
    { id: 'restricted-user', name: 'Restricted User' },
    { email: 'restricted@example.org', password: '1234' },
  )
  // Owner with the network `owner` role (full catalog ⇒ has group.create_hidden).
  // Use the factory `role` so the user gets EXACTLY ONE HAS_ROLE edge — adding a
  // second edge on top of the factory default would violate the single-role model
  // and (correctly) fail closed to USER_ROLE.
  ownerUser = await Factory.build(
    'user',
    { id: 'owner-user', name: 'Owner User', role: 'owner' },
    { email: 'owner-user@example.org', password: '1234' },
  )
  authenticatedUser = null
})

afterEach(async () => {
  await cleanDatabase()
})

describe('group.create_hidden backend enforcement', () => {
  describe('CreateGroup', () => {
    it('rejects creating a hidden group without group.create_hidden', async () => {
      authenticatedUser = await restrictedUser.toJson()
      const { errors } = await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'hidden-attempt', groupType: 'hidden' },
      })
      expect(errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('still allows creating a non-hidden group', async () => {
      authenticatedUser = await restrictedUser.toJson()
      const { data, errors } = await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'public-ok', groupType: 'public' },
      })
      expect(errors).toBeUndefined()
      expect(data?.CreateGroup).toMatchObject({ id: 'public-ok', groupType: 'public' })
    })

    it('allows creating a hidden group for an owner (has group.create_hidden)', async () => {
      authenticatedUser = await ownerUser.toJson()
      const { data, errors } = await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'hidden-by-owner', groupType: 'hidden' },
      })
      expect(errors).toBeUndefined()
      expect(data?.CreateGroup).toMatchObject({ id: 'hidden-by-owner', groupType: 'hidden' })
    })
  })

  describe('UpdateGroup', () => {
    it('rejects switching an existing group to hidden without group.create_hidden', async () => {
      authenticatedUser = await restrictedUser.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'to-hide', groupType: 'public' },
      })
      const { errors } = await mutate({
        mutation: UpdateGroup,
        variables: { id: 'to-hide', groupType: 'hidden' },
      })
      expect(errors![0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('allows owners (with group.create_hidden) to switch a group to hidden', async () => {
      authenticatedUser = await ownerUser.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'owner-to-hide', groupType: 'public' },
      })
      const { data, errors } = await mutate({
        mutation: UpdateGroup,
        variables: { id: 'owner-to-hide', groupType: 'hidden' },
      })
      expect(errors).toBeUndefined()
      expect(data?.UpdateGroup).toMatchObject({ id: 'owner-to-hide', groupType: 'hidden' })
    })

    it('lets a restricted owner edit an already-hidden group (no type change)', async () => {
      // Owner creates the hidden group, then hands ownership to the restricted user.
      authenticatedUser = await ownerUser.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: { ...baseVariables, id: 'already-hidden', groupType: 'hidden' },
      })
      await mutate({
        mutation: ChangeGroupMemberRole,
        variables: { groupId: 'already-hidden', userId: 'restricted-user', roleInGroup: 'owner' },
      })

      // The restricted user lacks group.create_hidden but may keep an already-hidden
      // group hidden while editing other fields.
      authenticatedUser = await restrictedUser.toJson()
      const { data, errors } = await mutate({
        mutation: UpdateGroup,
        variables: { id: 'already-hidden', groupType: 'hidden', name: 'Renamed Hidden' },
      })
      expect(errors).toBeUndefined()
      expect(data?.UpdateGroup).toMatchObject({
        id: 'already-hidden',
        groupType: 'hidden',
        name: 'Renamed Hidden',
      })
    })
  })
})
