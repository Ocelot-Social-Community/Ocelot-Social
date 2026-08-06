import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DEFAULT_COLOR_PRIMARY, resolveThemeColor } from '../dist/theme.js'

test('resolveThemeColor is the derived themeColor, else the framework default', () => {
  assert.equal(resolveThemeColor({ themeColor: 'rgb(1, 2, 3)' }), 'rgb(1, 2, 3)')
  assert.equal(resolveThemeColor({}), DEFAULT_COLOR_PRIMARY)
  assert.equal(resolveThemeColor(undefined), DEFAULT_COLOR_PRIMARY)
  // Pins the deliberate `||` over `??` (see theme.ts): an empty string is not a usable colour, so it
  // has to fall back like an absent one. Switching the operator would ship `theme_color: ""` into the
  // PWA manifest instead — a change that no other assertion here would notice.
  assert.equal(resolveThemeColor({ themeColor: '' }), DEFAULT_COLOR_PRIMARY)
})
