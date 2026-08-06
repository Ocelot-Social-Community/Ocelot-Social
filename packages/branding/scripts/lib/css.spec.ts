// What counts as a brandable token, and — the part that is easy to get wrong — under which conditions
// a declared value actually holds.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { customPropertiesIn } from './css.ts'

test('only :root declarations count — component-scoped properties stay private', () => {
  const css = `
    :root { --a: 1px; }
    .card { --private: 2px; }
    :root:root { --b: 3px; }
    @media (min-width: 600px) { .x { --nope: 5px } }
  `
  assert.deepEqual(customPropertiesIn(css), { a: '1px', b: '3px' })
})

test('later declarations win, comments and non-custom properties are ignored', () => {
  const css = `:root { --a: 1px; color: red; /* --fake: 9px; */ }\n:root { --a: 2px; }`
  assert.deepEqual(customPropertiesIn(css), { a: '2px' })
})

// The catalogue wants the name (a brand may set it), themeColor wants a value that always holds.
test('an at-rule :root counts as a token but not as an unconditional value', () => {
  const css = `
    :root { --color-primary: #123456; --only-dark: never-plain }
    @media (prefers-color-scheme: dark) { :root { --color-primary: black; --only-dark: yes } }
    @supports (color: oklch(0 0 0)) { :root { --color-primary: oklch(0.5 0.1 200) } }
  `
  assert.deepEqual(customPropertiesIn(css), {
    'color-primary': 'oklch(0.5 0.1 200)',
    'only-dark': 'yes',
  })
  assert.deepEqual(customPropertiesIn(css, { topLevelOnly: true }), {
    'color-primary': '#123456',
    'only-dark': 'never-plain',
  })
})

test('a rule nested in :root declares on the child, not on the root', () => {
  const css = `:root { --a: 1px; .card { --private: 2px } }`
  assert.deepEqual(customPropertiesIn(css), { a: '1px' })
})

// A brace inside a string or url() used to end the rule early and swallow every later declaration.
test('braces inside a value do not truncate the rule', () => {
  const css = `:root { --brace: '}' ; --u: url(a{b) ; --after: red }`
  assert.deepEqual(customPropertiesIn(css), { brace: "'}'", u: 'url(a{b)', after: 'red' })
})

test('multi-line values collapse to a single space', () => {
  const css = `:root { --gradient: linear-gradient(\n  red,\n  blue\n) }`
  assert.deepEqual(customPropertiesIn(css), { gradient: 'linear-gradient( red, blue )' })
})

test('malformed CSS throws rather than silently yielding a partial result', () => {
  assert.throws(() => customPropertiesIn(':root { --a: 1px'), /Unclosed block/)
})
