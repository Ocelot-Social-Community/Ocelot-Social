// The token interface lock. A framework token is something a brand may set (the admin lists them), so
// one that disappears turns every brand's value for it into a silent no-op. This list is the set of
// names that have been public; a name may only leave it through src/removedTokens.ts, i.e. on purpose.
//
// Additions need no step of their own: `npm run tokens:snapshot` adds new names to the list.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { FRAMEWORK_TOKENS } from '../dist/frameworkTokens.js'
import { REMOVED_TOKENS } from '../dist/removedTokens.js'

import { mergePublicTokens, removedTokenProblems } from './framework-tokens.ts'

const listed: string[] = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('./public-tokens.snapshot.json', import.meta.url)), 'utf8'),
  ) as { tokens: string[] }
).tokens

describe('public token lock', () => {
  test('every token that has been public is still declared, or was removed on purpose', () => {
    const gone = listed.filter((name) => !(name in FRAMEWORK_TOKENS) && !(name in REMOVED_TOKENS))
    assert.deepEqual(
      gone,
      [],
      `A brand may set these, and nothing reads the value any more: ${gone.map((n) => `--${n}`).join(', ')}.\n` +
        'Renamed? Give the new token a fallback to the old one (`--new: var(--old, <default>)`) and list the ' +
        "old one in src/removedTokens.ts with `use: 'new'`. Really going? List it there with a `note`.",
    )
  })

  test('an entry of removedTokens is really gone, was public, and its successor falls back to it', () => {
    assert.deepEqual(removedTokenProblems(REMOVED_TOKENS, FRAMEWORK_TOKENS, listed), [])
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

describe('removedTokenProblems', () => {
  const known = ['old', 'gone', 'plain']
  const framework = { new: 'var(--old, #123456)', other: '#fff' }

  test('a rename whose successor falls back to the old name is fine, with or without a space', () => {
    assert.deepEqual(removedTokenProblems({ old: { use: 'new' } }, framework, known), [])
    assert.deepEqual(
      removedTokenProblems({ old: { use: 'new' } }, { new: 'var( --old )' }, known),
      [],
    )
  })

  test('a plain removal needs a note, and is fine with one', () => {
    assert.deepEqual(removedTokenProblems({ gone: { note: 'unused' } }, framework, known), [])
    assert.match(removedTokenProblems({ gone: {} }, framework, known).join(), /neither/)
  })

  test('a rename without the fallback is a plain removal and is refused', () => {
    assert.match(
      removedTokenProblems({ old: { use: 'other' } }, framework, known).join(),
      /must fall back to it/,
    )
    // Another token whose name merely starts the same is not the redirect.
    assert.match(
      removedTokenProblems({ old: { use: 'new' } }, { new: 'var(--older, red)' }, known).join(),
      /must fall back to it/,
    )
  })

  test('a successor that does not exist, a token declared again, an unknown one are refused', () => {
    assert.match(
      removedTokenProblems({ old: { use: 'missing' } }, framework, known).join(),
      /not a framework token/,
    )
    assert.match(
      removedTokenProblems({ old: { note: 'x' } }, { old: '#fff' }, known).join(),
      /declared again/,
    )
    assert.match(
      removedTokenProblems({ unknown: { note: 'x' } }, framework, known).join(),
      /never a public token/,
    )
  })
})
