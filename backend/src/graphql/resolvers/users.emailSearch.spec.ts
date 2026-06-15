/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'
import { DEFAULT_ROLES } from '@src/role'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// A role that may manage users (role.manage) but must NOT read/search personal
// e-mail addresses (no user.email.readAny). Models an admin-defined custom role.
const ROLES: RoleDefinition[] = [
  ...DEFAULT_ROLES,
  { name: 'usermanager', protected: false, permissions: ['role.manage'] },
]

const searchQuery = `
  query ($roleName: String, $search: String) {
    User(roleName: $roleName, search: $search) {
      id
      name
    }
  }`

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, roles: ROLES })
let query: ApolloTestSetup['query']
let server: ApolloTestSetup['server']
let database: ApolloTestSetup['database']

beforeAll(async () => {
  await cleanDatabase()
  const setup = await createApolloTestSetup({ context })
  query = setup.query
  server = setup.server
  database = setup.database
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(async () => {
  await Factory.build(
    'user',
    { id: 'target', name: 'Target' },
    { email: 'target-secret@example.org', password: '1234' },
  )
  authenticatedUser = null
})

afterEach(async () => {
  await cleanDatabase()
})

describe('admin user search — e-mail filter is gated by user.email.readAny', () => {
  // A user with the `usermanager` role: role.manage but no user.email.readAny.
  // Built with `role: null` (no factory-default `user` edge), then linked to a real
  // `usermanager` role node via a single HAS_ROLE edge — so the user resolves through
  // an actual edge (exactly like production), and the in-memory ROLES override gives
  // that role its permissions. No literal-role shortcut.
  const asUserManager = async () => {
    const manager = await Factory.build(
      'user',
      { id: 'manager', name: 'Manager', role: null },
      { email: 'manager@example.org', password: '1234' },
    )
    await database.write({
      query: `MATCH (u:User { id: 'manager' })
              MERGE (r:Role { id: 'usermanager', name: 'usermanager' })
              MERGE (u)-[:HAS_ROLE]->(r)`,
    })
    authenticatedUser = (await manager.toJson()) as Context['user']
  }

  it('reaches the search (has role.manage) but does NOT match by e-mail (no oracle)', async () => {
    await asUserManager()
    const { data, errors } = await query({
      query: searchQuery,
      variables: { search: 'target-secret@' },
    })
    expect(errors).toBeUndefined()
    // Without user.email.readAny the e-mail term is not searchable → no leak.
    expect(data.User).toEqual([])
  })

  it('still matches by name for the same role.manage user', async () => {
    await asUserManager()
    const { data, errors } = await query({
      query: searchQuery,
      variables: { search: 'Target' },
    })
    expect(errors).toBeUndefined()
    expect(data.User.map((u: { name: string }) => u.name)).toEqual(['Target'])
  })
})
