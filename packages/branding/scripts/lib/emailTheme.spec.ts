// The token flattener and the e-mail stylesheet built from it. Both matter for a surface nobody looks
// at twice: a mail goes out once, to someone else's inbox, and a wrong colour there is never seen by
// the people who could fix it.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { buildEmailBrandingCss, EMAIL_THEME, resolveTokens } from './emailTheme.ts'

describe('resolveTokens', () => {
  test('passes literal values through untouched', () => {
    assert.deepEqual(resolveTokens({ 'color-primary': 'rgb(1, 2, 3)' }), {
      'color-primary': 'rgb(1, 2, 3)',
    })
  })

  test('follows a reference to another token', () => {
    assert.deepEqual(resolveTokens({ a: 'red', b: 'var(--a)' }), { a: 'red', b: 'red' })
  })

  test('follows a chain of references', () => {
    const out = resolveTokens({ a: 'red', b: 'var(--a)', c: 'var(--b)' })
    assert.equal(out.c, 'red')
  })

  test('resolves every reference in one declaration, not just the first', () => {
    const out = resolveTokens({ a: '1px', b: '2px', shadow: '0 var(--a) black, 0 var(--b) grey' })
    assert.equal(out.shadow, '0 1px black, 0 2px grey')
  })

  test('collapses whitespace, so two spellings of one value compare equal', () => {
    assert.equal(resolveTokens({ a: '  rgb(1,\n  2, 3) ' }).a, 'rgb(1, 2, 3)')
  })

  test('uses the fallback when the referenced token does not exist', () => {
    assert.equal(resolveTokens({ a: 'var(--nope, blue)' }).a, 'blue')
  })

  test('prefers the referenced token over its fallback', () => {
    assert.equal(resolveTokens({ x: 'green', a: 'var(--x, blue)' }).a, 'green')
  })

  // Dropped, not passed through: `color: var(--x)` in a client without custom properties is an
  // invalid declaration, so the framework's own value is the better outcome.
  describe('drops what it cannot flatten', () => {
    test('a reference to a token nobody declares', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--nope)' }), {})
    })

    test('a cycle', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--b)', b: 'var(--a)' }), {})
    })

    test('a self-reference', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--a)' }), {})
    })

    test('a token whose target is itself unresolvable', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--nope)', b: 'var(--a)' }), {})
    })

    // Replacing this would leave the inner `)` behind — corrupt CSS is worse than no declaration.
    test('a nested var() inside a fallback', () => {
      assert.deepEqual(resolveTokens({ x: 'red', a: 'var(--nope, var(--x))' }), { x: 'red' })
    })

    test('but keeps the tokens around the unresolvable one', () => {
      assert.deepEqual(resolveTokens({ good: 'red', bad: 'var(--nope)' }), { good: 'red' })
    })
  })
})

describe('buildEmailBrandingCss', () => {
  const FRAMEWORK = {
    'color-primary': 'rgb(23, 181, 63)',
    'color-primary-inverse': 'rgb(241, 253, 244)',
    'text-color-link': 'var(--color-primary)',
    'text-color-base': 'rgb(75, 69, 84)',
    'text-color-soft': 'rgb(112, 103, 126)',
    'font-family-text': "'LatoWeb', sans-serif",
  }

  test('emits nothing for a brand that overrides no mail-relevant token', () => {
    assert.equal(buildEmailBrandingCss(FRAMEWORK, { 'color-neutral-50': 'pink' }), '')
  })

  // The case that motivated all of this: a brand whose primary colour never reached its mails.
  test('rebrands links and the button from a single --color-primary override', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, { 'color-primary': 'rgb(239, 124, 0)' })

    assert.match(css, /a \{\n {2}color: rgb\(239, 124, 0\);\n\}/)
    assert.match(css, /a\.button \{\n {2}background: rgb\(239, 124, 0\);\n\}/)
  })

  // text-color-link is `var(--color-primary)` in the FRAMEWORK, so the two maps have to be merged
  // before flattening — resolving them separately would leave links on the ocelot green.
  test('propagates an override through a framework token that references it', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, { 'color-primary': 'rgb(239, 124, 0)' })

    assert.equal(css.includes('rgb(23, 181, 63)'), false)
  })

  test('groups several declarations under one selector', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, {
      'color-primary': 'black',
      'color-primary-inverse': 'white',
    })

    assert.match(css, /a\.button \{\n {2}background: black;\n {2}color: white;\n\}/)
  })

  test('carries the brand font family to every selector that sets one', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, { 'font-family-text': "'Inter', sans-serif" })

    // Asserted per rule rather than by counting occurrences: the declaration has to land in EACH of
    // them, and a single `font-family: 'Inter'` three times over would pass a naive count.
    for (const rule of css.split('\n\n')) {
      if (/^(body|a\.button|footer) \{/.test(rule)) {
        assert.match(rule, /font-family: 'Inter', sans-serif;/)
      }
    }
    for (const selector of ['body {', 'a.button {', 'footer {']) {
      assert.ok(css.includes(selector), selector)
    }
  })

  // Unchanged values must not be restated: the generated sheet overrides webflow.css, and repeating
  // its values there would make every later edit to the framework's mail styling a silent no-op.
  test('omits a token the brand sets to the value it already had', () => {
    assert.equal(buildEmailBrandingCss(FRAMEWORK, { 'color-primary': 'rgb(23, 181, 63)' }), '')
  })

  test('emits a token the framework does not declare at all', () => {
    const css = buildEmailBrandingCss({}, { 'text-color-base': 'navy' })

    assert.match(css, /h2 \{\n {2}color: navy;\n\}/)
  })

  test('skips a brand token that cannot be flattened rather than emitting var()', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, { 'color-primary': 'var(--does-not-exist)' })

    assert.equal(css.includes('var('), false)
  })

  test('explains itself in a comment, so nobody edits the generated file', () => {
    const css = buildEmailBrandingCss(FRAMEWORK, { 'color-primary': 'black' })

    assert.match(css, /^\/\*/)
    assert.match(css, /emailTheme\.ts/)
  })

  // The rules override webflow.css by being loaded after it, NOT by specificity — so every selector
  // has to be one that file actually styles, or the declaration lands on nothing.
  test('only targets selectors the framework mail stylesheet defines', () => {
    const styled = new Set(['a', 'a.button', 'h2', '.text-block', 'footer', 'body'])

    for (const { selector } of EMAIL_THEME) assert.ok(styled.has(selector), selector)
  })
})
