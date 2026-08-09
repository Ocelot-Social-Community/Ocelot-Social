import assert from 'node:assert/strict'
import { test } from 'node:test'

import { FRAMEWORK_TOKENS } from '../dist/frameworkTokens.js'
import { DEFAULT_COLOR_PRIMARY, resolveThemeColor } from '../dist/theme.js'

test("resolveThemeColor is the brand's color-primary token, else the framework default", () => {
  assert.equal(resolveThemeColor({ tokens: { 'color-primary': 'rgb(1, 2, 3)' } }), 'rgb(1, 2, 3)')
  assert.equal(resolveThemeColor({ tokens: {} }), DEFAULT_COLOR_PRIMARY)
  assert.equal(resolveThemeColor({}), DEFAULT_COLOR_PRIMARY)
  assert.equal(resolveThemeColor(undefined), DEFAULT_COLOR_PRIMARY)
  // A brand that overrides OTHER tokens but not this one still gets the framework colour — the map
  // holds the brand's own declarations, so an absent key means "not chosen", not "no theme".
  assert.equal(resolveThemeColor({ tokens: { 'color-danger': 'red' } }), DEFAULT_COLOR_PRIMARY)
  // Pins the deliberate `||` over `??` (see theme.ts): an empty string is not a usable colour, so it
  // has to fall back like an absent one. Switching the operator would ship `theme_color: ""` into the
  // PWA manifest instead — a change that no other assertion here would notice.
  assert.equal(resolveThemeColor({ tokens: { 'color-primary': '' } }), DEFAULT_COLOR_PRIMARY)
})

// An archive built before `tokens` existed still carries the old scalar. A deployment mounts archives
// from a volume that a new app image does not rewrite, so this is a live shape, not history.
test('falls back to the pre-0.1.2 themeColor field of an older archive', () => {
  assert.equal(resolveThemeColor({ themeColor: 'rgb(1, 2, 3)' }), 'rgb(1, 2, 3)')
  // A NEW archive wins over the legacy field when a composition mixes the two.
  assert.equal(
    resolveThemeColor({ tokens: { 'color-primary': 'rgb(4, 5, 6)' }, themeColor: 'rgb(1, 2, 3)' }),
    'rgb(4, 5, 6)',
  )
  // The old build wrote '' when a brand declared no --color-primary — not a usable colour either.
  assert.equal(resolveThemeColor({ themeColor: '' }), DEFAULT_COLOR_PRIMARY)
})

// The constant is no longer written by hand; it has to keep meaning what its name says.
test("DEFAULT_COLOR_PRIMARY is the framework palette's own color-primary", () => {
  assert.equal(DEFAULT_COLOR_PRIMARY, FRAMEWORK_TOKENS['color-primary'])
})
