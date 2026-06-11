/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'
import { RoleService } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let roleService: RoleService
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({ authenticatedUser, roleService })

const asAdmin = async () => {
  const admin = await Factory.build(
    'user',
    { id: 'admin-id', role: 'admin' },
    { email: 'admin@example.org', password: '1234' },
  )
  authenticatedUser = await admin.toJson()
}

const PERMISSION_CATALOG = `query { permissionCatalog { key group description } }`
const MY_PERMISSIONS = `query { myPermissions }`
const ROLES = `query { roles { name rank protected permissions memberCount } }`
const USER_ROLES = `query ($userId: ID!) { userRoles(userId: $userId) { name } }`
const CREATE_ROLE = `mutation ($name: String!, $description: String, $rank: Int!, $permissions: [String!]!) {
  createRole(name: $name, description: $description, rank: $rank, permissions: $permissions) {
    name permissions rank protected memberCount
  }
}`
const DELETE_ROLE = `mutation ($name: String!) { deleteRole(name: $name) }`
const ASSIGN_ROLE = `mutation ($userId: ID!, $roleName: String!) { assignRole(userId: $userId, roleName: $roleName) { id } }`
const UNASSIGN_ROLE = `mutation ($userId: ID!, $roleName: String!) { unassignRole(userId: $userId, roleName: $roleName) { id } }`

describe('role management', () => {
  beforeAll(async () => {
    await cleanDatabase()
    const setup = await createApolloTestSetup({ context: contextFn })
    query = setup.query
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

  beforeEach(async () => {
    await cleanDatabase()
    // A real, DB-backed RoleService, freshly seeded after each clean (cleanDatabase
    // removes the :Role nodes), so assign/unassign find the role nodes.
    roleService = new RoleService(database)
    await roleService.init()
    authenticatedUser = null
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('authorization (role.manage)', () => {
    it('denies permissionCatalog to a plain user', async () => {
      const user = await Factory.build(
        'user',
        { id: 'u', role: 'user' },
        { email: 'u@e.org', password: '1234' },
      )
      authenticatedUser = await user.toJson()
      const { data, errors } = await query({ query: PERMISSION_CATALOG })
      expect(data).toEqual(null)
      expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
    })

    it('allows permissionCatalog for an admin', async () => {
      await asAdmin()
      const { data, errors } = await query({ query: PERMISSION_CATALOG })
      expect(errors).toBeUndefined()
      expect(data.permissionCatalog.map((p: { key: string }) => p.key)).toEqual(
        expect.arrayContaining(['role.manage', 'badge.manage', 'post.create']),
      )
    })
  })

  describe('myPermissions', () => {
    it('returns the baseline for a member', async () => {
      const user = await Factory.build(
        'user',
        { id: 'u', role: 'user' },
        { email: 'u@e.org', password: '1234' },
      )
      authenticatedUser = await user.toJson()
      const { data } = await query({ query: MY_PERMISSIONS })
      expect(data.myPermissions).toEqual(
        expect.arrayContaining([
          'post.create',
          'group.create',
          'group.create_hidden',
          'user.invite',
        ]),
      )
      expect(data.myPermissions).not.toContain('role.manage')
    })

    it('includes admin permissions for an admin', async () => {
      await asAdmin()
      const { data } = await query({ query: MY_PERMISSIONS })
      expect(data.myPermissions).toEqual(
        expect.arrayContaining(['role.manage', 'content.moderate']),
      )
    })
  })

  describe('roles query', () => {
    it('lists the seeded roles', async () => {
      await asAdmin()
      const { data, errors } = await query({ query: ROLES })
      expect(errors).toBeUndefined()
      expect(data.roles.map((r: { name: string }) => r.name)).toEqual([
        'owner',
        'admin',
        'moderator',
        'user',
      ])
    })
  })

  describe('createRole', () => {
    beforeEach(asAdmin)

    it('creates a role, sanitising unknown permissions', async () => {
      const { data, errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: {
          name: 'badge-setter',
          description: 'x',
          rank: 15,
          permissions: ['badge.manage', 'ghost.perm'],
        },
      })
      expect(errors).toBeUndefined()
      expect(data.createRole).toMatchObject({
        name: 'badge-setter',
        permissions: ['badge.manage'],
        protected: false,
        memberCount: 0,
      })
    })

    it('rejects a duplicate role name', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'admin', description: null, rank: 1, permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/already exists/)
    })

    it('rejects an invalid role name', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'has spaces!', description: null, rank: 1, permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/Invalid role name/)
    })
  })

  describe('deleteRole guards', () => {
    beforeEach(asAdmin)

    it('refuses to delete the protected owner role', async () => {
      const { errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'owner' } })
      expect(errors?.[0].message).toMatch(/protected/)
    })

    it('refuses to delete the baseline user role', async () => {
      const { errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'user' } })
      expect(errors?.[0].message).toMatch(/baseline/)
    })

    it('deletes a custom role', async () => {
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'temp', description: null, rank: 1, permissions: [] },
      })
      const { data, errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'temp' } })
      expect(errors).toBeUndefined()
      expect(data.deleteRole).toBe('temp')
    })
  })

  describe('assignRole / unassignRole', () => {
    beforeEach(async () => {
      await Factory.build(
        'user',
        { id: 'member-id', role: 'user' },
        { email: 'member@e.org', password: '1234' },
      )
    })

    it('assigns a role and reflects it in userRoles', async () => {
      await asAdmin()
      await mutate({
        mutation: CREATE_ROLE,
        variables: {
          name: 'badge-setter',
          description: null,
          rank: 15,
          permissions: ['badge.manage'],
        },
      })
      const { errors } = await mutate({
        mutation: ASSIGN_ROLE,
        variables: { userId: 'member-id', roleName: 'badge-setter' },
      })
      expect(errors).toBeUndefined()
      const { data } = await query({ query: USER_ROLES, variables: { userId: 'member-id' } })
      expect(data.userRoles.map((r: { name: string }) => r.name)).toEqual(['badge-setter'])
    })

    it('forbids a (non-owner) admin from assigning the owner role', async () => {
      await asAdmin()
      const { errors } = await mutate({
        mutation: ASSIGN_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      expect(errors?.[0].message).toMatch(/owner/)
    })

    it('lets an owner assign owner, but refuses removing the last owner', async () => {
      authenticatedUser = { id: 'owner-actor', roles: ['owner'] } as unknown as Context['user']
      const assigned = await mutate({
        mutation: ASSIGN_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      expect(assigned.errors).toBeUndefined()
      // member is now the only owner → unassigning must be refused
      const { errors } = await mutate({
        mutation: UNASSIGN_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      expect(errors?.[0].message).toMatch(/last owner/)
    })
  })
})
