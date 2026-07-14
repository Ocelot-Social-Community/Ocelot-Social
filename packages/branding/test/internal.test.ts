// Shared config-tree helpers (isPlainObject / clone / deepMerge) — including the prototype-pollution
// hardening: forbidden merge keys are dropped and isPlainObject rejects built-in prototypes so a merge
// can never recurse into one. Run against the built dist (node --test).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { clone, deepMerge, isForbiddenMergeKey, isPlainObject } from '../dist/internal.js'

test('isPlainObject: accepts object literals + JSON.parse results', () => {
  assert.equal(isPlainObject({}), true)
  assert.equal(isPlainObject({ a: 1 }), true)
  assert.equal(isPlainObject(JSON.parse('{"a":1}')), true)
})

test('isPlainObject: rejects non-plain values (arrays, built-ins, instances, prototypes, nullish)', () => {
  assert.equal(isPlainObject([]), false)
  assert.equal(isPlainObject(new Date()), false)
  assert.equal(isPlainObject(/re/), false)
  assert.equal(isPlainObject(Object.prototype), false) // the pollution target must NOT be "plain"
  assert.equal(isPlainObject(Object.create(null)), false) // no Object.prototype → not a plain literal
  assert.equal(isPlainObject(null), false)
  assert.equal(isPlainObject(undefined), false)
  assert.equal(isPlainObject('x'), false)
  assert.equal(isPlainObject(1), false)
})

test('isForbiddenMergeKey: flags the prototype-pollution keys only', () => {
  assert.equal(isForbiddenMergeKey('__proto__'), true)
  assert.equal(isForbiddenMergeKey('constructor'), true)
  assert.equal(isForbiddenMergeKey('prototype'), true)
  assert.equal(isForbiddenMergeKey('menu'), false)
  assert.equal(isForbiddenMergeKey('de'), false)
})

test('clone: deep-copies JSON, passes undefined through, does not alias', () => {
  assert.equal(clone(undefined), undefined)
  const src = { a: { b: [1, 2] } }
  const copy = clone(src)
  assert.deepEqual(copy, src)
  copy.a.b.push(3)
  assert.deepEqual(src.a.b, [1, 2]) // original untouched
})

test('deepMerge: nested objects merge, arrays/scalars replace', () => {
  const merged = deepMerge(
    { a: { x: 1, y: 2 }, list: [1], scalar: 'old' },
    { a: { y: 9, z: 3 }, list: [2, 3], scalar: 'new' },
  )
  assert.deepEqual(merged, { a: { x: 1, y: 9, z: 3 }, list: [2, 3], scalar: 'new' })
})

test('deepMerge: drops a __proto__ key instead of polluting Object.prototype', () => {
  const patch = JSON.parse('{"a":1,"__proto__":{"POLLUTED_MERGE":"yes"}}')
  const merged = deepMerge({}, patch)
  assert.deepEqual(Object.keys(merged), ['a']) // __proto__ dropped
  assert.equal({}.POLLUTED_MERGE, undefined) // global prototype untouched
  assert.equal(Object.getPrototypeOf(merged), Object.prototype) // accumulator not reparented
})
