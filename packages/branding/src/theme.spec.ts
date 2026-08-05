import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DEFAULT_COLOR_PRIMARY, resolveThemeColor } from '../dist/theme.js'

test('resolveThemeColor is the derived themeColor, else the framework default', () => {
  assert.equal(resolveThemeColor({ themeColor: 'rgb(1, 2, 3)' }), 'rgb(1, 2, 3)')
  assert.equal(resolveThemeColor({}), DEFAULT_COLOR_PRIMARY)
  assert.equal(resolveThemeColor(undefined), DEFAULT_COLOR_PRIMARY)
})
