import assert from 'node:assert/strict'
import { test } from 'node:test'

import { THEME_DEFAULTS, resolveThemeColor } from '../dist/theme.js'

test('THEME_DEFAULTS lists the overridable palette with non-empty string defaults', () => {
  const keys = Object.keys(THEME_DEFAULTS)
  assert.ok(keys.length > 0)
  assert.equal(THEME_DEFAULTS['color-primary'], 'rgb(23, 181, 63)')
  assert.ok(keys.includes('color-secondary'))
  assert.ok(keys.includes('font-family-text'))
  for (const [key, value] of Object.entries(THEME_DEFAULTS)) {
    assert.equal(typeof value, 'string', `${key} should be a string`)
    assert.ok(value.length > 0, `${key} should be non-empty`)
    // keys are custom-property names WITHOUT the leading '--'
    assert.ok(!key.startsWith('--'), `${key} should not carry the -- prefix`)
  }
})

test('resolveThemeColor is the primary cssVar, else the framework default (no metadata.themeColor)', () => {
  assert.equal(resolveThemeColor({ 'color-primary': 'rgb(1, 2, 3)' }), 'rgb(1, 2, 3)')
  assert.equal(resolveThemeColor({}), THEME_DEFAULTS['color-primary'])
  assert.equal(resolveThemeColor(undefined), THEME_DEFAULTS['color-primary'])
})
