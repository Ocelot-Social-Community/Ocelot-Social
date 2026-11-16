// The token interface lock. A framework token is something a brand may set (the admin lists them), so
// one that disappears turns every brand's value for it into a silent no-op. This list is the set of
// names that have been public; a name may only leave it by being deleted from the list, i.e. on purpose, in the diff.
//
// Additions need no step of their own: `npm run tokens:snapshot` adds new names to the list.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { FRAMEWORK_TOKENS } from '../dist/frameworkTokens.js'

import { mergePublicTokens } from './framework-tokens.ts'

const listed: string[] = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('./public-tokens.snapshot.json', import.meta.url)), 'utf8'),
  ) as { tokens: string[] }
).tokens

describe('public token lock', () => {
  test('every token that has been public is still declared', () => {
    const gone = listed.filter((name) => !Object.hasOwn(FRAMEWORK_TOKENS, name))
    assert.deepEqual(
      gone,
      [],
      `A brand may set these, and nothing reads the value any more: ${gone.map((n) => `--${n}`).join(', ')}.\n` +
        'Dropping a token breaks the brands that set it: do it on purpose — delete the name from ' +
        'scripts/public-tokens.snapshot.json in the same PR, and name the replacement in the release notes.',
    )
  })

  test('the list names every declared token (run `npm run tokens:snapshot`)', () => {
    const missing = Object.keys(FRAMEWORK_TOKENS).filter((name) => !listed.includes(name))
    assert.deepEqual(missing, [], `not in public-tokens.snapshot.json: ${missing.join(', ')}`)
  })

  test('the list is sorted and has no duplicates', () => {
    assert.deepEqual(listed, mergePublicTokens(listed, []))
  })
})

describe('mergePublicTokens', () => {
  test('adds new names, keeps the ones that are gone, and sorts', () => {
    assert.deepEqual(mergePublicTokens(['b', 'gone'], ['c', 'a', 'b']), ['a', 'b', 'c', 'gone'])
  })
})
