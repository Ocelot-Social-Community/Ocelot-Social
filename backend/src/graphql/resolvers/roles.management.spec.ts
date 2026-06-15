/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

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
const ROLES = `query { roles { name protected permissions memberCount } }`
const USER_INFO = `query ($id: ID!) { User(id: $id) { id roleName } }`
const CREATE_ROLE = `mutation ($name: String!, $permissions: [String!]!) {
  createRole(name: $name, permissions: $permissions) {
    name permissions protected memberCount
  }
}`
const UPDATE_ROLE = `mutation ($name: String!, $permissions: [String!]!) {
  updateRole(name: $name, permissions: $permissions) {
    name permissions protected memberCount
  }
}`
const USER_ROLES = `query ($userId: ID!) { userRoles(userId: $userId) { name protected permissions } }`
const DELETE_ROLE = `mutation ($name: String!) { deleteRole(name: $name) }`
const SET_USER_ROLE = `mutation ($userId: ID!, $roleName: String!) { setUserRole(userId: $userId, roleName: $roleName) { id roleName } }`

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

    it('counts members by their single HAS_ROLE edge', async () => {
      await Factory.build('user', { id: 'm', role: 'user' }, { email: 'm@e.org', password: '1234' })
      await asAdmin() // admin-id, admin edge
      const { data } = await query({ query: ROLES })
      const roleList = data.roles as Array<{ name: string; memberCount: number }>
      const byName: Record<string, number> = Object.fromEntries(
        roleList.map((r) => [r.name, r.memberCount]),
      )
      expect(byName.user).toBeGreaterThanOrEqual(1) // the baseline member
      expect(byName.admin).toBeGreaterThanOrEqual(1) // the admin, via its edge
    })
  })

  describe('createRole', () => {
    beforeEach(asAdmin)

    it('creates a role, sanitising unknown permissions', async () => {
      const { data, errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: {
          name: 'badge-setter',
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
        variables: { name: 'admin', permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/already exists/)
    })

    it('rejects an invalid role name', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'has spaces!', permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/Invalid role name/)
    })
  })

  describe('updateRole', () => {
    beforeEach(asAdmin)

    it('updates a role’s permissions, sanitising unknown ones', async () => {
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'badge-setter', permissions: ['badge.manage'] },
      })
      const { data, errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'badge-setter', permissions: ['content.moderate', 'ghost.perm'] },
      })
      expect(errors).toBeUndefined()
      expect(data.updateRole).toMatchObject({
        name: 'badge-setter',
        permissions: ['content.moderate'],
        protected: false,
        memberCount: 0,
      })
    })

    it('reports the member count of the updated role', async () => {
      await Factory.build(
        'user',
        { id: 'holder', role: 'user' },
        { email: 'holder@e.org', password: '1234' },
      )
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'held', permissions: [] },
      })
      await mutate({ mutation: SET_USER_ROLE, variables: { userId: 'holder', roleName: 'held' } })
      const { data, errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'held', permissions: ['badge.manage'] },
      })
      expect(errors).toBeUndefined()
      expect(data.updateRole.memberCount).toBe(1)
    })

    it('rejects updating an unknown role', async () => {
      const { errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'does-not-exist', permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/Unknown role/)
    })

    it('forbids editing the protected owner role (RoleValidationError → Forbidden)', async () => {
      const { errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'owner', permissions: [] },
      })
      expect(errors?.[0].message).toMatch(/protected/)
    })
  })

  describe('userRoles', () => {
    it('returns the role(s) assigned to a user via their HAS_ROLE edge', async () => {
      await Factory.build(
        'user',
        { id: 'target', role: 'user' },
        { email: 'target@e.org', password: '1234' },
      )
      await asAdmin()
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'target', roleName: 'moderator' },
      })
      const { data, errors } = await query({ query: USER_ROLES, variables: { userId: 'target' } })
      expect(errors).toBeUndefined()
      expect(data.userRoles).toEqual([
        expect.objectContaining({ name: 'moderator', protected: false }),
      ])
    })

    it('returns an empty list for a user without a role edge', async () => {
      await Factory.build(
        'user',
        { id: 'edgeless', role: 'user' },
        { email: 'edgeless@e.org', password: '1234' },
      )
      // Strip the HAS_ROLE edge the factory created, so the user genuinely has none.
      await database.write({
        query: `MATCH (:User {id: $userId})-[h:HAS_ROLE]->(:Role) DELETE h`,
        variables: { userId: 'edgeless' },
      })
      await asAdmin()
      const { data, errors } = await query({ query: USER_ROLES, variables: { userId: 'edgeless' } })
      expect(errors).toBeUndefined()
      expect(data.userRoles).toEqual([])
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

    it('deletes a custom role that no user holds', async () => {
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'temp', permissions: [] },
      })
      const { data, errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'temp' } })
      expect(errors).toBeUndefined()
      expect(data.deleteRole).toBe('temp')
    })

    it('refuses to delete a role that is still assigned to a user', async () => {
      await Factory.build(
        'user',
        { id: 'holder', role: 'user' },
        { email: 'h@e.org', password: '1234' },
      )
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'held', permissions: [] },
      })
      await mutate({ mutation: SET_USER_ROLE, variables: { userId: 'holder', roleName: 'held' } })
      const { errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'held' } })
      expect(errors?.[0].message).toMatch(/assigned/)
    })
  })

  describe('setUserRole', () => {
    const readUser = async (id: string) => {
      const { data } = await query({ query: USER_INFO, variables: { id } })
      return data.User[0]
    }

    beforeEach(async () => {
      await Factory.build(
        'user',
        { id: 'member-id', role: 'user' },
        { email: 'member@e.org', password: '1234' },
      )
    })

    it('sets the single role and reflects it in roleName', async () => {
      await asAdmin()
      await mutate({
        mutation: CREATE_ROLE,
        variables: {
          name: 'badge-setter',
          permissions: ['badge.manage'],
        },
      })
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'badge-setter' },
      })
      expect(errors).toBeUndefined()
      const user = await readUser('member-id')
      expect(user.roleName).toBe('badge-setter')
    })

    it('replaces the previous role rather than accumulating', async () => {
      await asAdmin()
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'moderator' },
      })
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'admin' },
      })
      const user = await readUser('member-id')
      expect(user.roleName).toBe('admin')
    })

    it('rejects an unknown role name', async () => {
      await asAdmin()
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'no-such-role' },
      })
      expect(errors?.[0].message).toMatch(/Unknown role/)
    })

    it('forbids a (non-owner) admin from assigning the owner role', async () => {
      await asAdmin()
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      expect(errors?.[0].message).toMatch(/owner/)
    })

    it('lets an owner assign owner, but refuses demoting the last owner', async () => {
      authenticatedUser = { id: 'owner-actor', roleName: 'owner' } as unknown as Context['user']
      const assigned = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      expect(assigned.errors).toBeUndefined()
      // member is now the only owner → demoting them must be refused
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'user' },
      })
      expect(errors?.[0].message).toMatch(/last owner/)
    })

    it('forbids a (non-owner) admin from changing an owner’s role', async () => {
      // an owner first makes member-id an owner
      authenticatedUser = { id: 'owner-actor', roleName: 'owner' } as unknown as Context['user']
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'owner' },
      })
      // a (non-owner) admin must not be able to demote that owner
      await asAdmin()
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-id', roleName: 'user' },
      })
      expect(errors?.[0].message).toMatch(/owner/)
    })
  })

  describe('User admin search (roleName / search)', () => {
    const SEARCH = `query ($roleName: String, $search: String) {
      User(roleName: $roleName, search: $search) { id email roleName contributionsCount }
    }`

    it('filters users by their single role', async () => {
      await Factory.build(
        'user',
        { id: 'mod1', role: 'moderator' },
        { email: 'mod1@e.org', password: '1234' },
      )
      await asAdmin() // admin-id, admin role
      const { data, errors } = await query({
        query: SEARCH,
        variables: { roleName: 'moderator' },
      })
      expect(errors).toBeUndefined()
      const ids = data.User.map((u) => u.id)
      expect(ids).toContain('mod1')
      expect(ids).not.toContain('admin-id')
    })

    it('combines the role filter with a text search', async () => {
      await Factory.build(
        'user',
        { id: 'mod-anna', name: 'Anna', role: 'moderator' },
        { email: 'anna@e.org', password: '1234' },
      )
      await Factory.build(
        'user',
        { id: 'mod-bob', name: 'Bob', role: 'moderator' },
        { email: 'bob@e.org', password: '1234' },
      )
      await asAdmin()
      const { data, errors } = await query({
        query: SEARCH,
        variables: { roleName: 'moderator', search: 'ann' },
      })
      expect(errors).toBeUndefined()
      const ids = data.User.map((u) => u.id)
      expect(ids).toContain('mod-anna')
      expect(ids).not.toContain('mod-bob')
    })

    it('forbids the admin search without role.manage', async () => {
      const plain = await Factory.build(
        'user',
        { id: 'plain', role: 'user' },
        { email: 'plain@e.org', password: '1234' },
      )
      authenticatedUser = (await plain.toJson()) as Context['user']
      const { errors } = await query({ query: SEARCH, variables: { roleName: 'admin' } })
      expect(errors?.[0].message).toMatch(/Not Authorized/)
    })
  })
})
