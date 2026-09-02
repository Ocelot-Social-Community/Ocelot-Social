/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { jest } from '@jest/globals'

import Factory, { cleanDatabase } from '@db/factories'
import CREATE_ROLE from '@graphql/queries/roles/createRole.gql'
import DELETE_ROLE from '@graphql/queries/roles/deleteRole.gql'
import MY_PERMISSIONS from '@graphql/queries/roles/myPermissions.gql'
import PERMISSION_CATALOG from '@graphql/queries/roles/permissionCatalog.gql'
import RENAME_ROLE from '@graphql/queries/roles/renameRole.gql'
import RESYNC_CACHES from '@graphql/queries/roles/resyncCaches.gql'
import ROLES from '@graphql/queries/roles/roles.gql'
import SEARCH from '@graphql/queries/roles/searchUsersByRole.gql'
import SET_USER_ROLE from '@graphql/queries/roles/setUserRole.gql'
import UPDATE_ROLE from '@graphql/queries/roles/updateRole.gql'
import USER_ROLES from '@graphql/queries/roles/userRoles.gql'
import USER_INFO from '@graphql/queries/roles/userWithRole.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { PERMISSIONS_CHANGED_CHANNEL, RoleService } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let roleService: RoleService
// Optional per-test pubsub spy; when unset, the context falls back to the default
// server pubsub (harmless in-memory).
let pubsubMock: { publish: jest.Mock; asyncIterator: jest.Mock } | undefined
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({
  authenticatedUser,
  roleService,
  // Test spy standing in for the pubsub; cast since it implements only the bits the
  // role mutations use (publish). Undefined → the helper's default server pubsub.
  pubsub: pubsubMock as unknown as Context['pubsub'],
})

const asAdmin = async () => {
  const admin = await Factory.build(
    'user',
    { id: 'admin-id', role: 'admin' },
    { email: 'admin@example.org', password: '1234' },
  )
  authenticatedUser = await admin.toJson()
}

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
    pubsubMock = undefined
  })

  // The live permissionsChanged broadcast (clients refetch their permissions on it).
  describe('permissionsChanged broadcast', () => {
    beforeEach(async () => {
      pubsubMock = {
        publish: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
        asyncIterator: jest.fn(),
      }
      await asAdmin()
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'broadcast-role', permissions: [] },
      })
      pubsubMock.publish.mockClear()
    })

    it('does not broadcast on createRole (a brand-new role has no holders yet)', async () => {
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'fresh-role', permissions: [] },
      })
      expect(pubsubMock?.publish).not.toHaveBeenCalled()
    })

    it('broadcasts on updateRole (a role permission set changed)', async () => {
      await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'broadcast-role', permissions: ['post.pin'] },
      })
      expect(pubsubMock?.publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: 'broadcast-role', previousRoleName: null },
      })
    })

    it('broadcasts on renameRole with BOTH the new and the previous name (selection can follow)', async () => {
      await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'broadcast-role', newName: 'broadcast-renamed' },
      })
      expect(pubsubMock?.publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: 'broadcast-renamed', previousRoleName: 'broadcast-role' },
      })
    })

    it('broadcasts on deleteRole (former holders fall back to baseline)', async () => {
      await mutate({ mutation: DELETE_ROLE, variables: { name: 'broadcast-role' } })
      expect(pubsubMock?.publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: 'broadcast-role', previousRoleName: null },
      })
    })

    it('broadcasts on setUserRole (the target user permissions changed)', async () => {
      await Factory.build(
        'user',
        { id: 'member-x', role: 'user' },
        { email: 'member-x@example.org', password: '1234' },
      )
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-x', roleName: 'broadcast-role' },
      })
      expect(pubsubMock?.publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: 'broadcast-role', previousRoleName: null },
      })
    })

    it('does not fail the already-committed mutation when publish throws synchronously', async () => {
      // pubsub.publish is typed void | Promise<void>, so it may throw SYNCHRONOUSLY.
      // The DB write has already committed by the time we broadcast — a synchronous
      // throw must be swallowed, not surfaced as a mutation error. Guards the try-wrap
      // in publishPermissionsChanged (a bare Promise.resolve(publish()).catch() would
      // let it escape).
      pubsubMock?.publish.mockImplementation(() => {
        throw new Error('pubsub down')
      })
      const { data, errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'broadcast-role', permissions: ['post.pin'] },
      })
      expect(errors).toBeUndefined()
      expect(data?.updateRole).toMatchObject({
        name: 'broadcast-role',
        permissions: ['post.pin'],
      })
    })
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

    it('allows permissionCatalog for an admin, carrying gates without erroring on ungated keys', async () => {
      await asAdmin()
      const { data, errors } = await query({ query: PERMISSION_CATALOG })
      // Regression guard: an ungated permission's gatedBy must serialise as null, not
      // undefined (a resolver returning undefined for a nullable field is a GraphQL error).
      expect(errors).toBeUndefined()
      const catalog = data.permissionCatalog as Array<{
        key: string
        gatedBy: string | null
        available: boolean
      }>
      const byKey = new Map(catalog.map((p) => [p.key, p] as const))
      expect(byKey.get('post.create')).toMatchObject({ gatedBy: null, available: true })
      // gatedBy is now the first CURRENTLY-CLOSED gate (the actionable one). videoConference
      // is effectively off here (no LiveKit env), so it is the gate surfaced for the group
      // video-call right even though it is multi-gated (videoConference AND groupsEnabled).
      expect(byKey.get('videoCall.create_public')?.gatedBy).toBe('videoConference')
      expect(byKey.get('apiKey.create')?.gatedBy).toBe('apiKeysEnabled')
      // groupsEnabled defaults on (no env requirement), so group creation is available and
      // has no blocking gate — the group gate is open.
      expect(byKey.get('group.create_public')).toMatchObject({ gatedBy: null, available: true })
      // available is a non-null boolean for every entry.
      for (const entry of catalog) {
        expect(typeof entry.available).toBe('boolean')
      }
    })
  })

  describe('resyncCaches', () => {
    it('is allowed without auth outside production and resyncs the caches', async () => {
      // NODE_ENV=test → not production → the shield's isNotProduction branch permits it
      // (so db:reset / e2e can trigger a resync when no users exist). The resolver
      // reloads the role + policy caches from the DB and returns true.
      authenticatedUser = null
      const { data, errors } = await mutate({ mutation: RESYNC_CACHES })
      expect(errors).toBeUndefined()
      expect(data.resyncCaches).toBe(true)
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
      const keys = data.myPermissions.map((p: { key: string }) => p.key)
      expect(keys).toEqual(
        expect.arrayContaining([
          'post.create',
          'group.create_public',
          'group.create_closed',
          'group.create_hidden',
          'user.invite',
        ]),
      )
      expect(keys).not.toContain('role.manage')
    })

    it('includes admin permissions for an admin, each carrying its catalog group', async () => {
      await asAdmin()
      const { data } = await query({ query: MY_PERMISSIONS })
      const keys = data.myPermissions.map((p: { key: string }) => p.key)
      expect(keys).toEqual(expect.arrayContaining(['role.manage', 'content.moderate']))
      // Every entry carries its group, so the webapp can gate areas by group.
      expect(data.myPermissions).toEqual(
        expect.arrayContaining([
          { key: 'role.manage', group: 'administration' },
          { key: 'content.moderate', group: 'moderation' },
        ]),
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

  describe('renameRole', () => {
    beforeEach(asAdmin)

    it('renames a custom role, preserving its permissions and its members', async () => {
      await Factory.build(
        'user',
        { id: 'member-1', role: 'user' },
        { email: 'm1@e.org', password: '1234' },
      )
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'editor', permissions: ['post.pin'] },
      })
      await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'member-1', roleName: 'editor' },
      })

      const { data, errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'content-lead' },
      })

      expect(errors).toBeUndefined()
      // Permissions kept; the member moved with the role (edge preserved).
      expect(data.renameRole).toMatchObject({
        name: 'content-lead',
        permissions: ['post.pin'],
        memberCount: 1,
      })
      // The old name is gone and the member now reports the new role name.
      const { data: rolesData } = await query({ query: ROLES })
      expect(rolesData.roles.map((role: { name: string }) => role.name)).toContain('content-lead')
      expect(rolesData.roles.map((role: { name: string }) => role.name)).not.toContain('editor')
      const { data: userData } = await query({
        query: USER_INFO,
        variables: { id: 'member-1' },
      })
      expect(userData.User[0].roleName).toBe('content-lead')
    })

    it('forbids renaming the protected owner role', async () => {
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'owner', newName: 'boss' },
      })
      expect(errors?.[0].message).toMatch(/protected/)
    })

    it('forbids renaming the mandatory user role', async () => {
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'user', newName: 'member' },
      })
      expect(errors?.[0].message).toMatch(/mandatory/)
    })

    it('rejects renaming an unknown role', async () => {
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'nope', newName: 'whatever' },
      })
      expect(errors?.[0].message).toMatch(/Unknown role/)
    })

    it('rejects renaming onto an existing role name', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'admin' },
      })
      expect(errors?.[0].message).toMatch(/already exists/)
    })

    it('rejects an invalid new role name', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'Not Valid!' },
      })
      expect(errors?.[0].message).toMatch(/Invalid role name/)
    })

    it('maps a uniqueness-constraint race on the write to a stable conflict error', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      // Lose the race: the pre-check passes (the target name is free), then the write
      // throws the Neo4j uniqueness violation a concurrent rename would cause.
      const constraintError = Object.assign(new Error('constraint'), {
        code: 'Neo.ClientError.Schema.ConstraintValidationFailed',
      })
      jest.spyOn(roleService, 'renameRole').mockRejectedValueOnce(constraintError)
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'reviewer' },
      })
      expect(errors?.[0].message).toMatch(/already exists/)
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
      authenticatedUser = await plain.toJson()
      const { errors } = await query({ query: SEARCH, variables: { roleName: 'admin' } })
      expect(errors?.[0].message).toMatch(/Not Authorized/)
    })
  })
})
