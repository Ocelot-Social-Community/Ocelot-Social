// Value-invariant validation: defineBranding's build-time gate for well-typed-but-nonsensical configs
// (min > max, non-positive lengths, empty required strings) — what the TS type cannot catch.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { brandingDefaults } from '../dist/defaults.js'
import { defineBranding, validateBranding } from '../dist/index.js'

test('the framework defaults are valid (no violations)', () => {
  assert.deepEqual(validateBranding(brandingDefaults), [])
})

test('validateBranding collects ALL invariant violations, not just the first', () => {
  const bad = {
    ...brandingDefaults,
    group: {
      ...brandingDefaults.group,
      nameLengthMin: 60,
      nameLengthMax: 50,
      // 0 lines would collapse the group description preview to nothing at all
      descriptionCollapsedLines: 0,
    },
    user: {
      ...brandingDefaults.user,
      nameLengthMin: 60,
      nameLengthMax: 50,
      slugLengthMin: 60,
      slugLengthMax: 50,
    },
    registration: { ...brandingDefaults.registration, nonceLength: 0 },
    comment: { ...brandingDefaults.comment, truncateToLength: 5000, maxUntruncatedLength: 1200 },
    category: { min: 5, max: 3 },
    metadata: { ...brandingDefaults.metadata, applicationName: '   ' },
    dateTime: { ...brandingDefaults.dateTime, dateStyle: null, timeStyle: null },
  }
  const v = validateBranding(bad)
  assert.ok(
    v.some((x) => x.includes('group.nameLengthMin (60) must be ≤ group.nameLengthMax (50)')),
  )
  assert.ok(v.some((x) => x.includes('group.descriptionCollapsedLines must be ≥ 1')))
  assert.ok(v.some((x) => x.includes('user.nameLengthMin (60) must be ≤ user.nameLengthMax (50)')))
  assert.ok(v.some((x) => x.includes('user.slugLengthMin (60) must be ≤ user.slugLengthMax (50)')))
  assert.ok(v.some((x) => x.includes('registration.nonceLength must be ≥ 1')))
  assert.ok(
    v.some((x) => /comment\.truncateToLength .* must be ≤ comment\.maxUntruncatedLength/.test(x)),
  )
  assert.ok(v.some((x) => x.includes('category.min (5) must be ≤ category.max (3)')))
  assert.ok(v.some((x) => x.includes('metadata.applicationName must not be empty')))
  assert.ok(
    v.some((x) => x.includes('dateTime.dateStyle and dateTime.timeStyle must not both be null')),
  )
  assert.ok(v.length >= 6)
})

test('defineBranding THROWS on a well-typed but invalid override, listing the problem(s)', () => {
  assert.throws(
    () => defineBranding({ group: { nameLengthMin: 100 } }), // 100 > default max 50
    /invalid branding config[\s\S]*nameLengthMin \(100\) must be ≤ group\.nameLengthMax \(50\)/,
  )
})

test('defineBranding THROWS on an invalid user name length override, same as group', () => {
  assert.throws(
    () => defineBranding({ user: { nameLengthMin: 100 } }), // 100 > default max 50
    /invalid branding config[\s\S]*nameLengthMin \(100\) must be ≤ user\.nameLengthMax \(50\)/,
  )
})

test('defineBranding THROWS on an invalid user slug length override', () => {
  assert.throws(
    () => defineBranding({ user: { slugLengthMax: 2 } }), // 2 < default min 3
    /invalid branding config[\s\S]*slugLengthMin \(3\) must be ≤ user\.slugLengthMax \(2\)/,
  )
  // An empty slug would leave the profile URL without its last segment.
  assert.throws(
    () => defineBranding({ user: { slugLengthMin: 0 } }),
    /invalid branding config[\s\S]*user\.slugLengthMin must be ≥ 1 \(got 0\)/,
  )
  // A derived slug needs room for one character of the name, the hyphen and its counter.
  assert.throws(
    () => defineBranding({ user: { slugLengthMin: 1, slugLengthMax: 7 } }),
    /invalid branding config[\s\S]*user\.slugLengthMax must be ≥ 8 \(got 7\)/,
  )
})

test('defineBranding THROWS on a user name minimum of 0', () => {
  // The backend's DB schema holds User.name to at least USER_NAME_LENGTH_FLOOR characters, so a
  // brand allowing an empty name would let users store what the audit then reports.
  assert.throws(
    () => defineBranding({ user: { nameLengthMin: 0 } }),
    /invalid branding config[\s\S]*user\.nameLengthMin must be ≥ 1 \(got 0\)/,
  )
})

test('defineBranding accepts valid overrides and the vanilla (empty) config', () => {
  assert.doesNotThrow(() => defineBranding({}))
  assert.doesNotThrow(() => defineBranding({ group: { nameLengthMax: 80 } }))
  assert.doesNotThrow(() => defineBranding({ user: { nameLengthMax: 80 } }))
  assert.doesNotThrow(() => defineBranding({ user: { slugLengthMin: 1, slugLengthMax: 8 } }))
  assert.doesNotThrow(() => defineBranding({ category: { min: 0, max: 0 } })) // min ≤ max, both ≥ 0
})

test('theme.colorScheme must be a supported color-scheme value', () => {
  for (const colorScheme of ['light', 'dark', 'light dark']) {
    assert.doesNotThrow(() => defineBranding({ theme: { colorScheme } }))
  }
  assert.throws(
    () => defineBranding({ theme: { colorScheme: 'both' } }),
    /theme\.colorScheme must be one of 'light', 'dark', 'light dark' \(got 'both'\)/,
  )
})
