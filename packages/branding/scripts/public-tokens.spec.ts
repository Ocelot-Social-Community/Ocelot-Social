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

import { mergePublicTokens } from './framework-tokens.ts'

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
        'Keep each one in the stylesheet as an alias of what replaced it, or — if it is really going — ' +
        'list it in src/removedTokens.ts with what to set instead.',
    )
  })

  test('an entry of removedTokens is really gone, and was public', () => {
    for (const name of Object.keys(REMOVED_TOKENS)) {
      assert.ok(
        !(name in FRAMEWORK_TOKENS),
        `--${name} is declared again: drop it from removedTokens`,
      )
      assert.ok(
        listed.includes(name),
        `--${name} was never a public token: drop it from removedTokens`,
      )
    }
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
