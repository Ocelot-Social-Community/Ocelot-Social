import { describe, it, expect } from 'vitest'

import { User } from '@db/schema/index'

import { normalised, timestamp, withDefaults } from './defaults'

// No database: the point of this helper is what it guarantees in-process, and a round trip
// would hide it — two writes 40ms apart differ even with `new Date()`.

describe(timestamp, () => {
  const stamps = Array.from({ length: 200 }, () => timestamp())

  it('hands out a distinct value every time', () => {
    // `new Date().toISOString()` returns ONE value for all 200 in the same tick. Fixtures are
    // written straight in Cypher and are that fast, so nodes and edges built back to back tie.
    expect(new Set(stamps).size).toBe(stamps.length)
  })

  it('increases strictly, so a sort by it is stable', () => {
    // Ordering is the reason this exists: resolvers sort on these — `posts.spec`'s "pinned
    // post appears first even when created before other posts" for a node property, and
    // notifications.ts `ORDER BY notification.updatedAt` for an EDGE one, where `notification`
    // is the NOTIFIED relationship itself.
    expect(stamps).toEqual([...stamps].sort())
    expect(stamps.every((stamp, index) => index === 0 || stamp > stamps[index - 1])).toBe(true)
  })

  it('stays a valid ISO instant', () => {
    // It is written into properties the declaration types with ISO_DATE_TIME.
    for (const stamp of [stamps[0], stamps[stamps.length - 1]]) {
      expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    }
  })
})

describe(normalised, () => {
  it('drops an undefined value, so a default can still apply', () => {
    // A spread copies the key either way: `{ ...defaults, ...{ name: undefined } }` overwrites
    // the default with nothing, and `Factory.build('user', { name: someVar })` with an unset
    // variable then failed as "must have required property 'name'". Every other JS API reads an
    // undefined argument as "not given", and so did neode.
    expect(normalised({ name: undefined, about: 'here' })).toEqual({ about: 'here' })
  })

  it('keeps a null value, which means something else entirely', () => {
    // `SET n.x = null` REMOVES the property, and the fixtures rely on it to clear a default —
    // `Factory.build('emailAddress', { verifiedAt: null })` for an unverified address.
    expect(normalised({ verifiedAt: null })).toEqual({ verifiedAt: null })
  })

  it('normalises a slug the way the writing side does', () => {
    expect(normalised({ slug: 'Peter Pan' })).toEqual({ slug: 'peter-pan' })
  })
})

describe(withDefaults, () => {
  it('fills in the default for a property passed as undefined', () => {
    expect(withDefaults(User, { name: undefined }).name).toBe('Test User')
  })

  it.each([
    ['null, which means "remove this property"', null],
    ['an empty string, which is a value and a wrong one', ''],
  ])('does not substitute a timestamp for %s', (_case, given) => {
    // `!result.get(property)` read the VALUE, so both of these counted as "nothing was given"
    // and became the current time — a fixture that accepted the removal of a required property
    // and produced a node the declaration forbids, or turned a bad value into a good one.
    //
    // The same shape as neode's GenerateDefaultValues.js:45 (`if (output[key])`), which skipped
    // `slot: 0` and left three seeded SELECTED edges holding a FLOAT.
    expect(withDefaults(User, { createdAt: given }).createdAt).toBe(given)
  })

  it('still fills a timestamp in where the key is absent', () => {
    expect(withDefaults(User, {}).createdAt).toBeTypeOf('string')
  })

  it('leaves a null alone, so clearing a property still means clearing it', () => {
    // It then fails validation for a REQUIRED property, which is the correct answer rather than
    // a quietly substituted default.
    expect(withDefaults(User, { name: null }).name).toBeNull()
  })
})
