// The theme catalogue is DERIVED, never stored: these tests pin the derivation and the one value the
// package still has to know by itself.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { DEFAULT_COLOR_PRIMARY } from '../dist/index.js'

import { catalogAvailable, computeCatalog } from './theme-catalog.ts'

test('the catalogue comes from the webapp stylesheets and covers the palette', () => {
  assert.ok(catalogAvailable(), 'webapp/assets/css should be reachable from this repo')
  const catalog = computeCatalog()
  assert.ok(Object.keys(catalog).length > 50)
  assert.equal(catalog['color-primary'], DEFAULT_COLOR_PRIMARY)
  for (const [key, value] of Object.entries(catalog)) {
    assert.ok(!key.startsWith('--'), `${key} must be stored without the -- prefix`)
    assert.ok(value.length > 0, `${key} has an empty default`)
  }
})

// The single value the package cannot derive (the PWA manifest needs a literal colour). This is the
// drift guard that replaces the 193-entry generated file.
test('DEFAULT_COLOR_PRIMARY still matches what the stylesheets declare', () => {
  assert.equal(DEFAULT_COLOR_PRIMARY, computeCatalog()['color-primary'])
})

test('an unreachable stylesheet directory means "cannot check", not "no tokens"', () => {
  assert.equal(catalogAvailable('/definitely/not/here'), false)
  assert.deepEqual(computeCatalog('/definitely/not/here'), {})
})

test('computeCatalog reads every stylesheet in the directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-catalog-'))
  try {
    writeFileSync(join(dir, 'a.css'), ':root { --one: 1px; --shared: from-a }')
    writeFileSync(join(dir, 'b.css'), ':root { --two: 2px; --shared: from-b }')
    writeFileSync(join(dir, 'ignored.txt'), ':root { --nope: x }')
    assert.deepEqual(computeCatalog(dir), { one: '1px', shared: 'from-b', two: '2px' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
