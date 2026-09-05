import { describe, it, expect } from 'vitest'

import { readAllRoles } from './repository'

import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

// `db` is injected, so the row-shaping half of this repository is reachable without a database.
// That half is where the decisions live: everything below is about what happens to a `permissions`
// column that is not what the code hopes for — null, malformed, or not a list. Those states are
// not hypothetical. The column is JSON-stringified free text written by the admin UI and by boot
// seeding, and a role that fails to load is a role whose permissions silently stop applying.
const dbReturning = (rows: Array<Record<string, unknown>>): DbContext =>
  ({
    query: async () => {
      await Promise.resolve()
      return {
        // A Map rather than indexing the row object: a driver record answers by column name, and
        // Map.get models that lookup without turning a column name into a property access.
        records: rows.map((row) => {
          const columns = new Map(Object.entries(row))
          return { get: (key: string) => columns.get(key) }
        }),
      }
    },
  }) as unknown as DbContext

const row = (over: Record<string, unknown> = {}) => ({
  name: 'moderator',
  protected: false,
  permissions: '[]',
  ...over,
})

describe(readAllRoles, () => {
  // Real catalog keys on purpose: sanitizePermissions drops anything it does not recognise, so a
  // made-up key here would make this test pass for the wrong reason — it would assert the empty
  // list that a broken mapping also produces.
  it('maps a stored role into its definition', async () => {
    const [role] = await readAllRoles(
      dbReturning([row({ permissions: '["role.manage","policy.manage"]', protected: true })]),
    )

    expect(role).toEqual({
      name: 'moderator',
      protected: true,
      permissions: ['role.manage', 'policy.manage'],
    })
  })

  // A role node written before the column existed has `permissions` unset. Without the `?? '[]'`
  // JSON.parse would receive null, and the role would arrive with permissions undefined rather
  // than empty — the difference between "grants nothing" and "grants whatever a later `??` picks".
  it('treats a missing permissions column as an empty list', async () => {
    const [role] = await readAllRoles(dbReturning([row({ permissions: null })]))

    expect(role.permissions).toEqual([])
  })

  // Malformed JSON must FAIL CLOSED. Letting the SyntaxError escape would take down every caller
  // of readAllRoles — role resolution runs on authorisation paths, so one corrupted row would
  // turn into a site-wide outage instead of one role granting nothing.
  it('falls back to no permissions when the stored JSON is malformed', async () => {
    const [role] = await readAllRoles(dbReturning([row({ permissions: '{not json' })]))

    expect(role.permissions).toEqual([])
    expect(role.name).toBe('moderator')
  })

  // Only SyntaxError is a "corrupted data" signal. Anything else coming out of the parse step is
  // a bug or an environment failure, and swallowing it here would convert it into a role that
  // quietly grants nothing — the same observable state as corruption, with no way to tell them
  // apart in an incident.
  it('rethrows a non-SyntaxError raised while parsing', async () => {
    const boom = new TypeError('Cannot convert object to primitive value')
    const hostile = {
      toString: () => {
        throw boom
      },
    }

    await expect(readAllRoles(dbReturning([row({ permissions: hostile })]))).rejects.toThrow(boom)
  })

  // Valid JSON that is not an array — `{"post:create": true}`, an object the admin UI could
  // produce from a checkbox map. sanitizePermissions expects a list; handing it an object would
  // sanitise to something unpredictable rather than to "nothing".
  it('ignores valid JSON that is not a list', async () => {
    const [role] = await readAllRoles(dbReturning([row({ permissions: '{"post:create":true}' })]))

    expect(role.permissions).toEqual([])
  })

  // Catalog drift: a permission that no longer exists must be dropped, not carried. A removed
  // permission grants nothing, and keeping the string would let a stale role match a key that a
  // future release reintroduces with a different meaning.
  it('drops permissions the catalog no longer knows', async () => {
    const [role] = await readAllRoles(
      dbReturning([row({ permissions: '["definitely:not:a:real:permission"]' })]),
    )

    expect(role.permissions).toEqual([])
  })

  it('returns an empty list when there are no role nodes', async () => {
    await expect(readAllRoles(dbReturning([]))).resolves.toEqual([])
  })
})
