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
    registration: { ...brandingDefaults.registration, nonceLength: 0 },
    comment: { ...brandingDefaults.comment, truncateToLength: 5000, maxUntruncatedLength: 1200 },
    category: { min: 5, max: 3 },
    metadata: { ...brandingDefaults.metadata, applicationName: '   ' },
  }
  const v = validateBranding(bad)
  assert.ok(
    v.some((x) => x.includes('group.nameLengthMin (60) must be ≤ group.nameLengthMax (50)')),
  )
  assert.ok(v.some((x) => x.includes('group.descriptionCollapsedLines must be ≥ 1')))
  assert.ok(v.some((x) => x.includes('registration.nonceLength must be ≥ 1')))
  assert.ok(
    v.some((x) => /comment\.truncateToLength .* must be ≤ comment\.maxUntruncatedLength/.test(x)),
  )
  assert.ok(v.some((x) => x.includes('category.min (5) must be ≤ category.max (3)')))
  assert.ok(v.some((x) => x.includes('metadata.applicationName must not be empty')))
  assert.ok(v.length >= 5)
})

test('defineBranding THROWS on a well-typed but invalid override, listing the problem(s)', () => {
  assert.throws(
    () => defineBranding({ group: { nameLengthMin: 100 } }), // 100 > default max 50
    /invalid branding config[\s\S]*nameLengthMin \(100\) must be ≤ group\.nameLengthMax \(50\)/,
  )
})

test('defineBranding accepts valid overrides and the vanilla (empty) config', () => {
  assert.doesNotThrow(() => defineBranding({}))
  assert.doesNotThrow(() => defineBranding({ group: { nameLengthMax: 80 } }))
  assert.doesNotThrow(() => defineBranding({ category: { min: 0, max: 0 } })) // min ≤ max, both ≥ 0
})
