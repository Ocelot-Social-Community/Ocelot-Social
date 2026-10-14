/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { parse } from 'graphql'
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CREATE_ROLE from '@graphql/queries/roles/createRole.gql'
import DELETE_ROLE from '@graphql/queries/roles/deleteRole.gql'
import RENAME_ROLE from '@graphql/queries/roles/renameRole.gql'
import SET_USER_ROLE from '@graphql/queries/roles/setUserRole.gql'
import UPDATE_ROLE from '@graphql/queries/roles/updateRole.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { allPermissionKeys } from '@src/permission'
import { ADMIN_ROLE, MODERATOR_ROLE, RoleService, USER_ROLE } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Who may change which network role, and give whom which role (#10485).
//
// `role.manage` alone used to decide all of it: a moderator holding it demoted an admin on stage,
// and nothing stopped them from making themselves an admin either. Now the same rules as inside a
// group decide — outrank whom you act on, hold what you hand out — with one difference the network
// wants: one's OWN role is shaped freely, because that is what `role.manage` is for. Only never
// above a role it does not outrank today.
//
// Against a real database: the shield, the resolver, the role service and the HAS_ROLE edges.

let authenticatedUser: Context['user']
let roleService: RoleService
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({ authenticatedUser, roleService })

const ROLES_OFFERED = parse(`
  query {
    roles {
      name
      editableByCurrentUser
      assignableByCurrentUser
    }
  }
`)

const CATALOG_OFFERED = parse(`
  query {
    permissionCatalog {
      key
      grantableByCurrentUser
    }
  }
`)

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

const rights = (roleName: string): string[] => roleService.getRole(roleName)?.permissions ?? []

const roleOf = async (userId: string): Promise<string> => {
  const { records } = await database.query({
    query: `MATCH (:User {id: $userId})-[:HAS_ROLE]->(r:Role) RETURN r.name AS name`,
    variables: { userId },
  })
  return records[0]?.get('name') as string
}

const user = (id: string, role: string) =>
  Factory.build('user', { id, role }, { email: `${id}@example.org`, password: '1234' })

const errorCode = (errors: readonly { extensions?: Record<string, unknown> }[] | undefined) =>
  errors?.[0]?.extensions?.errorCode

beforeEach(async () => {
  await cleanDatabase()
  roleService = new RoleService(database)
  await roleService.init()
  // The moderator of stage: allowed to manage roles, and nothing else of an admin's.
  await roleService.upsertRole(
    {
      name: MODERATOR_ROLE,
      protected: false,
      permissions: [...rights(MODERATOR_ROLE), 'role.manage'],
    },
    'test',
  )
  await user('admin', ADMIN_ROLE)
  await user('member', USER_ROLE)
  const moderator = await user('moderator', MODERATOR_ROLE)
  authenticatedUser = await moderator.toJson()
})

const setUserRole = async (userId: string, roleName: string) =>
  mutate({ mutation: SET_USER_ROLE, variables: { userId, roleName } })

const updateRole = async (name: string, permissions: string[]) =>
  mutate({ mutation: UPDATE_ROLE, variables: { name, permissions } })

describe('a moderator who may manage roles', () => {
  describe('giving roles', () => {
    it('cannot change an admin`s role', async () => {
      const { errors } = await setUserRole('admin', USER_ROLE)

      expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED')
      expect(await roleOf('admin')).toBe(ADMIN_ROLE)
    })

    it('cannot make anybody an admin', async () => {
      const { errors } = await setUserRole('member', ADMIN_ROLE)

      expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_NOT_COVERED')
      expect(await roleOf('member')).toBe(USER_ROLE)
    })

    it('cannot make themselves an admin', async () => {
      const { errors } = await setUserRole('moderator', ADMIN_ROLE)

      expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_NOT_COVERED')
      expect(await roleOf('moderator')).toBe(MODERATOR_ROLE)
    })

    it('makes somebody they outrank a moderator', async () => {
      const { errors } = await setUserRole('member', MODERATOR_ROLE)

      expect(errors).toBeUndefined()
      expect(await roleOf('member')).toBe(MODERATOR_ROLE)
    })

    it('steps down themselves', async () => {
      const { errors } = await setUserRole('moderator', USER_ROLE)

      expect(errors).toBeUndefined()
      expect(await roleOf('moderator')).toBe(USER_ROLE)
    })
  })

  describe('changing roles', () => {
    it('cannot take rights away from the admin role', async () => {
      const before = rights(ADMIN_ROLE)
      const { errors } = await updateRole(ADMIN_ROLE, [])

      expect(errorCode(errors)).toBe('ROLE_CHANGE_NOT_OUTRANKED')
      expect(rights(ADMIN_ROLE)).toEqual(before)
    })

    it('cannot rename or delete the admin role', async () => {
      const renamed = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: ADMIN_ROLE, newName: 'former-admin' },
      })
      const deleted = await mutate({ mutation: DELETE_ROLE, variables: { name: ADMIN_ROLE } })

      expect(errorCode(renamed.errors)).toBe('ROLE_CHANGE_NOT_OUTRANKED')
      expect(errorCode(deleted.errors)).toBe('ROLE_CHANGE_NOT_OUTRANKED')
      expect(roleService.getRole(ADMIN_ROLE)).toBeDefined()
    })

    it('gives their own role a right they did not hold', async () => {
      // `role.manage` is the right to shape roles, their own included.
      const { errors } = await updateRole(MODERATOR_ROLE, [...rights(MODERATOR_ROLE), 'post.pin'])

      expect(errors).toBeUndefined()
      expect(rights(MODERATOR_ROLE)).toContain('post.pin')
    })

    it('cannot raise their own role above the admins, to re-role them after all', async () => {
      // An admin role missing one right: every admin right plus that one would outrank it.
      await roleService.upsertRole(
        {
          name: ADMIN_ROLE,
          protected: false,
          permissions: rights(ADMIN_ROLE).filter((key) => key !== 'branding.manage'),
        },
        'test',
      )
      const { errors } = await updateRole(MODERATOR_ROLE, [
        ...rights(ADMIN_ROLE),
        'branding.manage',
        'role.manage',
      ])

      expect(errorCode(errors)).toBe('ROLE_SAVE_WOULD_OUTRANK')
      expect(rights(MODERATOR_ROLE)).not.toContain('branding.manage')
    })

    it('may come level with the admins, which still does not let them act on one', async () => {
      const { errors } = await updateRole(MODERATOR_ROLE, rights(ADMIN_ROLE))

      expect(errors).toBeUndefined()
      expect(errorCode((await setUserRole('admin', USER_ROLE)).errors)).toBe(
        'ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED',
      )
    })

    it('cannot fill a role they outrank with rights they do not hold', async () => {
      const { errors } = await updateRole(USER_ROLE, [...rights(USER_ROLE), 'user.delete.any'])

      expect(errorCode(errors)).toBe('ROLE_SAVE_NOT_COVERED')
      expect(rights(USER_ROLE)).not.toContain('user.delete.any')
    })

    it('changes a role they outrank within their own rights', async () => {
      const { errors } = await updateRole(USER_ROLE, [...rights(USER_ROLE), 'badge.manage'])

      expect(errors).toBeUndefined()
      expect(rights(USER_ROLE)).toContain('badge.manage')
    })

    it('cannot create a role with rights they do not hold', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'deputy', permissions: ['policy.manage'] },
      })

      expect(errorCode(errors)).toBe('ROLE_SAVE_NOT_COVERED')
      expect(roleService.getRole('deputy')).toBeUndefined()
    })

    it('creates a role within their own rights', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'deputy', permissions: ['user.disable'] },
      })

      expect(errors).toBeUndefined()
      expect(rights('deputy')).toEqual(['user.disable'])
    })
  })

  // The admin pages offer exactly what the mutations above accept.
  it('is offered only the roles and rights they may hand out', async () => {
    const { data } = await query({ query: ROLES_OFFERED })
    const offered = Object.fromEntries(
      (
        data?.roles as {
          name: string
          editableByCurrentUser: boolean
          assignableByCurrentUser: boolean
        }[]
      ).map((role) => [role.name, [role.editableByCurrentUser, role.assignableByCurrentUser]]),
    )

    expect(offered).toEqual({
      owner: [false, false],
      admin: [false, false],
      moderator: [true, true],
      user: [true, true],
    })

    const catalog = await query({ query: CATALOG_OFFERED })
    const grantable = new Map(
      (catalog.data?.permissionCatalog as { key: string; grantableByCurrentUser: boolean }[]).map(
        (entry) => [entry.key, entry.grantableByCurrentUser],
      ),
    )

    expect(grantable.get('user.disable')).toBe(true)
    expect(grantable.get('policy.manage')).toBe(false)
    // Participation gives no power over others; anybody who may shape roles may hand it out.
    expect(grantable.get('post.create')).toBe(true)
  })
})

// role.manage stays the first question: without it, none of the rules below is even asked.
describe('somebody without role.manage', () => {
  beforeEach(async () => {
    authenticatedUser = await (await user('plain', USER_ROLE)).toJson()
  })

  it('may give nobody a role, create a role or change one', async () => {
    const assigned = await setUserRole('member', MODERATOR_ROLE)
    const created = await mutate({
      mutation: CREATE_ROLE,
      variables: { name: 'deputy', permissions: [] },
    })
    const updated = await updateRole(USER_ROLE, rights(USER_ROLE))

    for (const { errors } of [assigned, created, updated]) {
      expect(errors?.[0]?.message).toBe('Not Authorized!')
    }

    expect(await roleOf('member')).toBe(USER_ROLE)
    expect(roleService.getRole('deputy')).toBeUndefined()
  })
})

describe('an admin', () => {
  beforeEach(async () => {
    authenticatedUser = await (
      await Factory.build(
        'user',
        { id: 'other-admin', role: ADMIN_ROLE },
        { email: 'other-admin@example.org', password: '1234' },
      )
    ).toJson()
  })

  it('gives their own role a right it lacked', async () => {
    const missing = allPermissionKeys().find((key) => !rights(ADMIN_ROLE).includes(key))
    const extended = missing ? [...rights(ADMIN_ROLE), missing] : rights(ADMIN_ROLE)
    const { errors } = await updateRole(ADMIN_ROLE, extended)

    expect(errors).toBeUndefined()
    expect(rights(ADMIN_ROLE)).toEqual(expect.arrayContaining(extended))
  })

  it('still manages moderators', async () => {
    const { errors } = await setUserRole('moderator', USER_ROLE)

    expect(errors).toBeUndefined()
    expect(await roleOf('moderator')).toBe(USER_ROLE)
  })

  it('does not re-role a fellow admin', async () => {
    const { errors } = await setUserRole('admin', USER_ROLE)

    expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED')
  })
})
