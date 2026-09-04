/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { PubSub } from 'graphql-subscriptions'
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest'

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
import { OWNER_ROLE, PERMISSIONS_CHANGED_CHANNEL, RoleService } from '@src/role'

import rolesResolvers, { publishPermissionsChanged } from './roles'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { Mock } from 'vitest'

let authenticatedUser: Context['user']
let roleService: RoleService
// Optional per-test pubsub spy; when unset, the context falls back to the default
// server pubsub (harmless in-memory).
let pubsubMock: { publish: Mock; asyncIterator: Mock } | undefined
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
        publish: vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
        asyncIterator: vi.fn(),
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

    it('surfaces an infrastructure failure as such, not as a permission problem', async () => {
      // Only RoleValidationError means "the rules forbid this"; anything else (a dropped
      // Neo4j connection, a constraint we do not model) must keep its own identity.
      // Rewriting it to ForbiddenError would tell the admin they lack rights while the
      // database is simply down.
      vi.spyOn(roleService, 'upsertRole').mockRejectedValueOnce(new Error('database is down'))
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'doomed', permissions: [] },
      })

      expect(errors?.[0].extensions?.code).not.toBe('FORBIDDEN')
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

    it('surfaces an infrastructure failure as such, not as a permission problem', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      vi.spyOn(roleService, 'upsertRole').mockRejectedValueOnce(new Error('database is down'))
      const { errors } = await mutate({
        mutation: UPDATE_ROLE,
        variables: { name: 'editor', permissions: [] },
      })

      expect(errors?.[0].extensions?.code).not.toBe('FORBIDDEN')
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

    it('skips an edge pointing at a Role node the role cache does not know', async () => {
      // A :Role node can outlive the cache entry (deleted on another instance, a
      // half-applied migration). getRole() then returns undefined, and without the
      // type-guard filter that undefined would be mapped into the non-nullable
      // [Role!]! list — a GraphQL "cannot return null" error instead of a clean list.
      await Factory.build(
        'user',
        { id: 'orphan', role: 'user' },
        { email: 'orphan@e.org', password: '1234' },
      )
      await database.write({
        query: `MATCH (:User {id: 'orphan'})-[h:HAS_ROLE]->(:Role) DELETE h`,
      })
      await database.write({
        query: `MATCH (u:User {id: 'orphan'})
                MERGE (r:Role {id: 'vanished', name: 'vanished'})
                MERGE (u)-[:HAS_ROLE]->(r)`,
      })
      await asAdmin()
      const { data, errors } = await query({ query: USER_ROLES, variables: { userId: 'orphan' } })

      expect(errors).toBeUndefined()
      expect(data.userRoles).toEqual([])
    })

    it('reports the baseline role name for a user without a role edge', async () => {
      // roleName drives the admin UI and the webapp's role display; an edgeless user
      // must report the baseline they effectively have, not null.
      await Factory.build(
        'user',
        { id: 'edgeless-name', role: 'user' },
        { email: 'edgeless-name@e.org', password: '1234' },
      )
      await database.write({
        query: `MATCH (:User {id: $userId})-[h:HAS_ROLE]->(:Role) DELETE h`,
        variables: { userId: 'edgeless-name' },
      })
      await asAdmin()
      const { data, errors } = await query({
        query: USER_INFO,
        variables: { id: 'edgeless-name' },
      })

      expect(errors).toBeUndefined()
      expect(data.User[0].roleName).toBe('user')
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

    it('surfaces an infrastructure failure as such, not as a permission problem', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'temp', permissions: [] } })
      vi.spyOn(roleService, 'deleteRole').mockRejectedValueOnce(new Error('database is down'))
      const { errors } = await mutate({ mutation: DELETE_ROLE, variables: { name: 'temp' } })

      expect(errors?.[0].extensions?.code).not.toBe('FORBIDDEN')
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
      vi.spyOn(roleService, 'renameRole').mockRejectedValueOnce(constraintError)
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'reviewer' },
      })

      expect(errors?.[0].message).toMatch(/already exists/)
    })

    it('accepts renaming a role to its own name as a no-op', async () => {
      // The "already exists" pre-check looks the new name up in the cache, where the
      // role being renamed is of course still present. Without the `name !== newName`
      // guard, saving the admin form without touching the name field would fail with
      // "Role 'editor' already exists" — the role colliding with itself.
      await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'editor', permissions: ['post.pin'] },
      })
      const { data, errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'editor' },
      })

      expect(errors).toBeUndefined()
      expect(data.renameRole).toMatchObject({ name: 'editor', permissions: ['post.pin'] })
    })

    it('surfaces a non-constraint write failure instead of reporting a name conflict', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      // A generic write failure carries no Neo4j error code, so the conflict mapping
      // must not claim the target name is taken — that would send the admin looking for
      // a role that does not exist.
      vi.spyOn(roleService, 'renameRole').mockRejectedValueOnce(new Error('database is down'))
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'reviewer' },
      })

      expect(errors?.[0].message).not.toMatch(/already exists/)
      expect(errors?.[0].extensions?.code).not.toBe('FORBIDDEN')
    })

    it('does not crash when the failure is not an Error object', async () => {
      await mutate({ mutation: CREATE_ROLE, variables: { name: 'editor', permissions: [] } })
      // A rejection can carry any value. `'code' in err` throws a TypeError on a
      // primitive, so the conflict check must gate on `err instanceof Error` first —
      // otherwise the original failure is masked by a TypeError from the error handler.
      vi.spyOn(roleService, 'renameRole').mockRejectedValueOnce('database is down')
      const { errors } = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: 'editor', newName: 'reviewer' },
      })

      expect(errors?.[0].message).not.toMatch(/in' operator/)
      expect(errors?.[0].message).not.toMatch(/already exists/)
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

    it('rejects a user id that does not exist', async () => {
      // The owner guard runs on OPTIONAL MATCH, so a stale user id (a deleted account
      // still listed in an open admin tab) passes it and only the write finds nothing.
      // Without this check the mutation would return null for a non-nullable field.
      await asAdmin()
      const { errors } = await mutate({
        mutation: SET_USER_ROLE,
        variables: { userId: 'no-such-user', roleName: 'moderator' },
      })

      expect(errors?.[0].message).toMatch(/Could not find User/)
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

describe('Subscription.permissionsChanged', () => {
  it('delivers the changed role name, plus the previous one on a rename', async () => {
    // The webapp keeps an admin roles view open while another admin edits. The event
    // carries both names so a viewer with the renamed role selected can follow the
    // selection instead of losing it on the refetch.
    const pubsub = new PubSub()
    const context = { pubsub } as unknown as Context
    const iterator = rolesResolvers.Subscription.permissionsChanged.subscribe(null, null, context)
    const next = iterator.next()

    publishPermissionsChanged(context, 'content-lead', 'editor')

    const { value } = await next

    expect(
      rolesResolvers.Subscription.permissionsChanged.resolve(
        value as { permissionsChanged: { roleName: string | null } },
      ),
    ).toEqual({ roleName: 'content-lead', previousRoleName: 'editor' })
  })
})

// The resolvers' own guards, exercised without the schema. The shield guarantees an
// authenticated role.manage actor and Neo4j's `count(*)` always yields a row, so these
// paths cannot be reached through a GraphQL request — they decide whether the resolvers
// degrade or crash when a future internal caller (a CLI task, a migration) skips both.
describe('roles resolver guards (direct invocation)', () => {
  const contextWithout = (parts: Record<string, unknown>) =>
    ({
      user: null,
      pubsub: { publish: vi.fn() },
      ...parts,
    }) as unknown as Context

  const definition = { name: 'editor', protected: false, permissions: [] }
  // `count(*)` never returns an empty result in production; this stands in for a caller
  // that hands the resolvers a database stub, and for a driver returning nothing at all.
  const noRows = () => vi.fn().mockResolvedValue({ records: [] })

  it('records "unknown" as the audit actor when the context carries no user', async () => {
    // Every role write is audited with the acting user's id. A missing user must be
    // recorded as such, not written as `undefined` into the audit trail (or crash on
    // property access) — the trail is the only record of who changed permissions.
    const upsertRole = vi.fn().mockResolvedValue(definition)
    const renameRole = vi.fn().mockResolvedValue({ ...definition, name: 'renamed' })
    const deleteRole = vi.fn().mockResolvedValue(undefined)
    const context = contextWithout({
      role: {
        getRole: (name: string) => (name === 'editor' ? definition : undefined),
        upsertRole,
        renameRole,
        deleteRole,
      },
      database: { query: noRows() },
    })

    await rolesResolvers.Mutation.createRole(null, { name: 'fresh', permissions: [] }, context)
    await rolesResolvers.Mutation.updateRole(null, { name: 'editor', permissions: [] }, context)
    await rolesResolvers.Mutation.renameRole(null, { name: 'editor', newName: 'renamed' }, context)
    await rolesResolvers.Mutation.deleteRole(null, { name: 'editor' }, context)

    expect(upsertRole).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: 'fresh' }),
      'unknown',
    )
    expect(upsertRole).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: 'editor' }),
      'unknown',
    )
    expect(renameRole).toHaveBeenCalledWith('editor', 'renamed', 'unknown')
    expect(deleteRole).toHaveBeenCalledWith('editor', 'unknown')
  })

  it('reports memberCount 0 when the member count query yields no row', async () => {
    // memberCount is a non-nullable Int. A row-less result must degrade to 0 rather than
    // produce undefined/NaN, which the schema would reject as a null for a non-null field.
    const context = contextWithout({
      role: { getRole: () => definition, upsertRole: vi.fn().mockResolvedValue(definition) },
      database: { query: noRows() },
    })

    const updated = await rolesResolvers.Mutation.updateRole(
      null,
      { name: 'editor', permissions: [] },
      context,
    )

    expect(updated).toMatchObject({ name: 'editor', memberCount: 0 })
  })

  it('refuses to grant the owner role when the context carries no user', async () => {
    // Owner is the failsafe role: only an owner may hand it out. The check reads the
    // actor's effective role, so a context without a user must fall through to the
    // baseline and be refused — never treated as an owner by default.
    const context = contextWithout({
      role: { getRole: () => ({ name: OWNER_ROLE, protected: true, permissions: [] }) },
      database: { query: noRows() },
    })

    await expect(
      rolesResolvers.Mutation.setUserRole(
        null,
        { userId: 'target', roleName: OWNER_ROLE },
        context,
      ),
    ).rejects.toThrow(/Only an owner/)
  })
})
