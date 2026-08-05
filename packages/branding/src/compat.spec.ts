// Schema-version compatibility (compat.ts) + the SCHEMA_VERSION drift guard. The breaking axis is the
// MAJOR once >= 1.0, else the MINOR while 0.x (a 0.0.z patch is non-breaking).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { checkSchemaCompat, describeSchemaCompat } from '../dist/compat.js'
import { SCHEMA_VERSION } from '../dist/version.js'

test('SCHEMA_VERSION stays in lock-step with package.json (drift guard)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
  assert.equal(SCHEMA_VERSION, pkg.version)
})

test('same breaking generation → ok', () => {
  assert.equal(checkSchemaCompat('0.0.1', '0.0.1'), 'ok')
  assert.equal(checkSchemaCompat('0.0.1', '0.0.9'), 'ok') // 0.0.z patch = non-breaking
  assert.equal(checkSchemaCompat('1.2.0', '1.5.0'), 'ok') // same major (>= 1)
})

test('archive built with a NEWER schema → archive-newer', () => {
  assert.equal(checkSchemaCompat('0.1.0', '0.0.5'), 'archive-newer') // 0.x minor bump
  assert.equal(checkSchemaCompat('1.0.0', '0.9.0'), 'archive-newer') // crossing into 1.0
  assert.equal(checkSchemaCompat('2.0.0', '1.5.0'), 'archive-newer') // major bump
})

test('archive built with an OLDER schema → archive-older', () => {
  assert.equal(checkSchemaCompat('0.0.1', '0.1.0'), 'archive-older')
  assert.equal(checkSchemaCompat('0.9.0', '1.0.0'), 'archive-older')
  assert.equal(checkSchemaCompat('1.0.0', '2.0.0'), 'archive-older')
})

test('missing / unparseable version → unknown', () => {
  assert.equal(checkSchemaCompat(null, '0.0.1'), 'unknown')
  assert.equal(checkSchemaCompat('0.0.1', null), 'unknown')
  assert.equal(checkSchemaCompat('not-a-version', '0.0.1'), 'unknown')
  assert.equal(checkSchemaCompat(undefined, undefined), 'unknown')
})

test('runtime version defaults to the package SCHEMA_VERSION', () => {
  assert.equal(checkSchemaCompat(SCHEMA_VERSION), 'ok')
})

test('describeSchemaCompat: a message only for real mismatches', () => {
  assert.equal(describeSchemaCompat('ok', '0.0.1'), null)
  assert.equal(describeSchemaCompat('unknown', null), null)
  assert.match(describeSchemaCompat('archive-newer', '1.0.0', '0.9.0') ?? '', /NEWER/)
  assert.match(describeSchemaCompat('archive-older', '0.9.0', '1.0.0') ?? '', /OLDER/)
})
