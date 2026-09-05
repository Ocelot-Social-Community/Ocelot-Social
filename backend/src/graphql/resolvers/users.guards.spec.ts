/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// The parts of users.ts a GraphQL request cannot reach, called directly — same idea as
// posts.guards.spec.ts.
//
// What lives here are the DRIFT guards. Each one refuses an input the schema does not currently
// permit, so no query can produce it: `_UserFilter` offers exactly the three keys the resolver
// implements, and `Deletable` exactly the two labels it deletes. That is precisely why they need
// covering from here — their whole job is to fail loudly the day someone widens the schema
// without widening the resolver, and a guard that has never been executed is a guard nobody knows
// works. Silently ignoring an unimplemented filter would WIDEN a result set the caller believes
// to be narrowed, and an unhandled `Deletable` label would report a deletion that did not happen.
//
// Plus the two paths that depend on a middleware being absent: the anonymous mute list, and the
// User query built without soft-delete arguments (DISABLED_MIDDLEWARES is a supported deployment
// knob, so "softDelete is not in the chain" is a real configuration, not a hypothetical).
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

import usersResolvers, { getMutedUsers } from './users'

import type { Context } from '@src/context'
import type { Driver } from 'neo4j-driver'

let driver: Driver
let database: ReturnType<typeof databaseContext>

// Only what each guard reads before it refuses. A resolver that needed more than this got further
// than the test claims it does.
const anonymousContext = () =>
  ({ user: null, driver, database, effectivePermissions: new Set() }) as unknown as Context

const viewerContext = (id: string) =>
  ({
    user: { id },
    driver,
    database,
    effectivePermissions: new Set(),
    cypherParams: { currentUserId: id },
  }) as unknown as Context

beforeAll(async () => {
  await cleanDatabase()
  driver = getDriver()
  database = databaseContext()
})

afterAll(async () => {
  await cleanDatabase()
  await database.driver.close()
  database.neode.close()
  await closeDriver()
})

describe(getMutedUsers, () => {
  // Called from filterForMutedUsers on every post list, including the ones an anonymous visitor
  // sees. Without the early return it would query `MATCH (user:User {id: null})` on every such
  // request — a full label scan that can never match.
  it('returns an empty list for an anonymous viewer', async () => {
    await expect(getMutedUsers(anonymousContext())).resolves.toEqual([])
  })
})

describe('Query.User', () => {
  // `_UserFilter` currently offers exactly id / id_in / hasLocation, so GraphQL validation rejects
  // anything else before the resolver sees it. This asserts what happens on the day a fourth key
  // is added to the input type and not to the resolver.
  it('refuses a filter key it does not implement instead of ignoring it', async () => {
    await expect(
      usersResolvers.Query.User(
        null,
        { filter: { name_contains: 'anna' } },
        anonymousContext(),
        null,
      ),
    ).rejects.toThrow('Unsupported User filter: name_contains.')
  })

  // softDeleteMiddleware always sets `deleted` (and `disabled` for non-moderators) on this query,
  // so through the schema the WHERE clause is never empty. It CAN be empty when that middleware
  // is switched off via DISABLED_MIDDLEWARES, and the query has to stay valid Cypher then — an
  // unconditional `WHERE` with nothing behind it is a syntax error, not an empty filter.
  it('builds a valid query when no condition applies at all', async () => {
    await Factory.build('user', { id: 'unfiltered-user', name: 'Unfiltered' })

    const result = await usersResolvers.Query.User(null, {}, viewerContext('unfiltered-user'), null)

    expect(result.map((user: { id: string }) => user.id)).toContain('unfiltered-user')
  })
})

describe('Mutation.DeleteUser', () => {
  // `resource: [Deletable]`, and Deletable enumerates Post and Comment — the two labels the
  // Cypher below the guard knows how to black out. A third value added to the enum would
  // otherwise be accepted, reported as deleted, and leave the content untouched.
  it('refuses a resource label it cannot delete', async () => {
    await Factory.build('user', { id: 'delete-me', name: 'Delete Me' })

    await expect(
      usersResolvers.Mutation.DeleteUser(
        null,
        { id: 'delete-me', resource: ['Group'] },
        viewerContext('delete-me'),
        null,
      ),
    ).rejects.toThrow('Invalid resource type: Group')

    // The refusal has to happen before anything is written: the guard sits inside the same write
    // transaction that blacks the account out, so a late throw would still have marked the user
    // deleted on its way past.
    const { records } = await database.query({
      query: 'MATCH (user:User { id: "delete-me" }) RETURN user { .name, .deleted } AS user',
    })

    expect(records[0].get('user')).toMatchObject({ name: 'Delete Me' })
  })
})
