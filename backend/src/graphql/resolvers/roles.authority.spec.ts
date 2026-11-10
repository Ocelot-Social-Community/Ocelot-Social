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
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, RoleService, USER_ROLE } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Who may change which network role, and give whom which role (#10485).
//
// `role.manage` alone used to decide all of it: a moderator holding it demoted an admin on stage,
// and nothing stopped them from making themselves an admin either. Giving roles now follows the
// same rules as inside a group — outrank whom you act on, hold what you hand out.
//
// Shaping the roles themselves does not: `role.manage` is the right to shape every role but `owner`
// freely, removing rights included and adding any right there is. That makes it a key to
// everything below the owner, who is the anchor (#10869 audit log, #10870 owner notification).
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
      assignableByCurrentUser
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

  // `role.manage` shapes every role but `owner` freely — removing rights included, and adding any
  // right there is. Whom a role is given to stays ranked (above).
  describe('shaping roles', () => {
    it('takes rights away from the admin role', async () => {
      const { errors } = await updateRole(ADMIN_ROLE, ['post.create'])

      expect(errors).toBeUndefined()
      expect(rights(ADMIN_ROLE)).toEqual(['post.create'])
    })

    it('puts a right they do not hold into another role', async () => {
      const { errors } = await updateRole(USER_ROLE, [...rights(USER_ROLE), 'policy.manage'])

      expect(errors).toBeUndefined()
      expect(rights(USER_ROLE)).toContain('policy.manage')
    })

    it('gives their own role any right', async () => {
      const { errors } = await updateRole(MODERATOR_ROLE, allPermissionKeys())

      expect(errors).toBeUndefined()
      expect(rights(MODERATOR_ROLE)).toEqual(expect.arrayContaining(allPermissionKeys()))
    })

    it('creates a role with rights they do not hold', async () => {
      const { errors } = await mutate({
        mutation: CREATE_ROLE,
        variables: { name: 'deputy', permissions: ['policy.manage'] },
      })

      expect(errors).toBeUndefined()
      expect(rights('deputy')).toEqual(['policy.manage'])
    })

    it('renames a role above their own', async () => {
      const renamed = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: ADMIN_ROLE, newName: 'board' },
      })

      expect(renamed.errors).toBeUndefined()
      expect(roleService.getRole('board')).toBeDefined()
    })

    it('deletes an empty role above their own', async () => {
      await roleService.upsertRole(
        { name: 'board', protected: false, permissions: rights(ADMIN_ROLE) },
        'test',
      )
      const deleted = await mutate({ mutation: DELETE_ROLE, variables: { name: 'board' } })

      expect(deleted.errors).toBeUndefined()
      expect(roleService.getRole('board')).toBeUndefined()
    })

    it('cannot delete a role while somebody holds it', async () => {
      const deleted = await mutate({ mutation: DELETE_ROLE, variables: { name: ADMIN_ROLE } })

      expect(errorCode(deleted.errors)).toBe('ROLE_DELETE_ROLE_HAS_MEMBERS')
      expect(roleService.getRole(ADMIN_ROLE)).toBeDefined()
    })

    // The anchor: the owner role is not shaped by anybody.
    it('cannot change, rename or delete the owner role', async () => {
      const updated = await updateRole(OWNER_ROLE, [])
      const renamed = await mutate({
        mutation: RENAME_ROLE,
        variables: { name: OWNER_ROLE, newName: 'boss' },
      })
      const deleted = await mutate({ mutation: DELETE_ROLE, variables: { name: OWNER_ROLE } })

      for (const { errors } of [updated, renamed, deleted]) {
        expect(errors).toBeDefined()
      }

      expect(roleService.getRole(OWNER_ROLE)).toBeDefined()
    })

    it('cannot delete the user role', async () => {
      const deleted = await mutate({ mutation: DELETE_ROLE, variables: { name: USER_ROLE } })

      expect(errorCode(deleted.errors)).toBe('ROLE_DELETE_SYSTEM_ROLE')
    })

    // Shaping a role is not giving it: the admin keeps their role until somebody who outranks
    // them changes it.
    it('may make their own role equal to the admins`, which still does not let them re-role one', async () => {
      const { errors } = await updateRole(MODERATOR_ROLE, rights(ADMIN_ROLE))

      expect(errors).toBeUndefined()
      expect(errorCode((await setUserRole('admin', USER_ROLE)).errors)).toBe(
        'ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED',
      )
    })
  })

  // The admin pages offer exactly what setUserRole accepts.
  it('is offered only the roles they may hand out', async () => {
    const { data } = await query({ query: ROLES_OFFERED })
    const offered = Object.fromEntries(
      (data?.roles as { name: string; assignableByCurrentUser: boolean }[]).map((role) => [
        role.name,
        role.assignableByCurrentUser,
      ]),
    )

    expect(offered).toEqual({ owner: false, admin: false, moderator: true, user: true })
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

  // The one right the default admin lacks, videoCall.create_restricted, is participation: the
  // coverage check leaves it out, so an admin may create a role holding the full catalog and take
  // it themselves. Its authority is exactly the admin's — it must not rank them above their peers.
  it('cannot lift themselves above their fellow admins with a role that only adds participation', async () => {
    const created = await mutate({
      mutation: CREATE_ROLE,
      variables: { name: 'superadmin', permissions: allPermissionKeys() },
    })

    expect(created.errors).toBeUndefined()
    expect((await setUserRole('other-admin', 'superadmin')).errors).toBeUndefined()

    authenticatedUser = { ...authenticatedUser, roleName: 'superadmin' } as Context['user']
    const { errors } = await setUserRole('admin', USER_ROLE)

    expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED')
    expect(await roleOf('admin')).toBe(ADMIN_ROLE)
  })

  it('does not re-role a fellow admin', async () => {
    const { errors } = await setUserRole('admin', USER_ROLE)

    expect(errorCode(errors)).toBe('ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED')
  })
})
