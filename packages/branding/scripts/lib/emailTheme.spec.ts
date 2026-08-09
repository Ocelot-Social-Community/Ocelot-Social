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

  // A fallback may be a function call, so a var() expression ends at its BALANCED paren. Stopping at
  // the first one substituted all but the last character and left it stranded: `rgb(23, 181, 63))`,
  // which reached the generated stylesheet and made every mail client drop the declaration.
  describe('a fallback that is itself a function', () => {
    test('substitutes the whole expression when the token resolves', () => {
      const out = resolveTokens({
        'color-primary': 'rgb(23, 181, 63)',
        a: 'var(--color-primary, rgb(1, 2, 3))',
      })

      assert.equal(out.a, 'rgb(23, 181, 63)')
    })

    // The unresolvable direction happened to come out right — the `)` the truncated fallback lost was
    // the same one left over — so only asserting this case would have missed the bug entirely.
    test('uses the whole function as the fallback when the token does not exist', () => {
      assert.equal(resolveTokens({ a: 'var(--nope, rgb(1, 2, 3))' }).a, 'rgb(1, 2, 3)')
    })

    test('handles nested parens deeper than one level', () => {
      assert.equal(
        resolveTokens({ a: 'var(--nope, calc(1px + max(2px, 3px)))' }).a,
        'calc(1px + max(2px, 3px))',
      )
    })

    // The scan resumes AFTER the expression it replaced, so a second reference alongside a function
    // fallback is still found — and not searched for inside the text just substituted.
    test('keeps resolving further references after one', () => {
      const out = resolveTokens({ x: '1px', a: 'var(--x) var(--nope, rgb(1, 2, 3))' })

      assert.equal(out.a, '1px rgb(1, 2, 3)')
    })

    // The whole point of dropping a token: what a mail client cannot use must not be written at all.
    test('never leaves a stray paren in the generated stylesheet', () => {
      const css = buildEmailBrandingCss(
        { 'color-primary': 'rgb(23, 181, 63)' },
        { 'text-color-base': 'var(--color-primary, rgb(1, 2, 3))' },
      )

      assert.match(css, /color: rgb\(23, 181, 63\);/)
      assert.equal(css.includes('63))'), false)
    })
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

    // A fallback does NOT lift a token out of its cycle: CSS builds the dependency graph from the
    // references themselves, "including in the fallback argument of var()" (css-variables-1 §3), and
    // every property on a cycle is invalid at computed-value time. Resolving `a` to red here would
    // put a colour in a mail that the source theme never effectively defines — and `b` inherited it
    // too, by reading a's memoised value on the next pass.
    test('a cycle whose members carry fallbacks', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--b, red)', b: 'var(--a)' }), {})
      assert.deepEqual(resolveTokens({ a: 'var(--a, red)' }), {})
    })

    // The whole cycle, not just the token the walk happened to re-enter — the entry point is an
    // artefact of key order, so a three-token ring must drop identically whichever end it starts at.
    test('every member of a longer ring, whichever end resolution starts from', () => {
      const ring = { a: 'var(--b, red)', b: 'var(--c)', c: 'var(--a)' }

      assert.deepEqual(resolveTokens(ring), {})
      assert.deepEqual(resolveTokens({ c: ring.c, b: ring.b, a: ring.a }), {})
    })

    // A token OUTSIDE the cycle keeps its fallback: the cycle members are guaranteed-invalid, and a
    // var() pointing at an invalid property substitutes its fallback exactly as a browser would.
    test('but leaves a fallback outside the cycle intact', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--b)', b: 'var(--a)', c: 'var(--a, blue)' }), {
        c: 'blue',
      })
    })

    // A reference NESTED in a fallback is an edge like any other (css-variables-1 §3 counts them
    // "including in the fallback argument of var()"). It is invisible to the substitution pass — that
    // one cannot replace a nested var() at all and gives up at the first — so a cycle running through
    // one is only a cycle in the GRAPH. Reading membership off the substitution walk instead resolved
    // `b` to red here: two dead ends that never met, rather than the ring they actually form.
    test('a cycle that closes through a nested fallback', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--missing, var(--b))', b: 'var(--a, red)' }), {})
    })

    // The nested reference must count as an edge WITHOUT the token becoming resolvable by it: `a` is
    // still dropped for the value reason (no replacement can be written), while `x` is untouched.
    test('still drops a nested fallback that is not in a cycle, and keeps its target', () => {
      assert.deepEqual(resolveTokens({ x: 'red', a: 'var(--nope, var(--x))' }), { x: 'red' })
    })

    // Entered from OUTSIDE: nothing walks into the b→c→b ring until `a` leads there, so the first
    // traversal reaches its members mid-path. Membership is a property of the graph, not of where a
    // walk happened to start — an SCC pass says so for every node in one pass, while "what sat on the
    // path when it re-entered" depends on the entry point.
    test('every member of a cycle reached only through another token', () => {
      assert.deepEqual(resolveTokens({ a: 'var(--b)', b: 'var(--c)', c: 'var(--b)' }), {})
    })

    // Two disjoint rings plus a token depending on neither: the pass must not spill from one
    // component into the other, nor collect an innocent bystander.
    test('marks two separate rings without touching what lies between them', () => {
      assert.deepEqual(
        resolveTokens({
          a: 'var(--b)',
          b: 'var(--a)',
          fine: 'green',
          y: 'var(--z)',
          z: 'var(--y)',
        }),
        { fine: 'green' },
      )
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

    // A `var(` whose expression never closes. The scan has to end at the buffer and report it, not
    // return a reference reaching to the end of the string and splice past it.
    test('a var() that is missing its closing paren', () => {
      assert.deepEqual(resolveTokens({ good: 'red', bad: 'var(--good, rgb(1, 2' }), { good: 'red' })
    })

    // Not valid var() syntax, so the substitution pass has nothing to replace and skips it — and the
    // value would have been stored, and written into the mail, still saying `var(`. That is the one
    // thing this module exists to prevent, whatever the reason the reference could not be flattened.
    test('a reference the substitution pass cannot parse, rather than emitting it verbatim', () => {
      assert.deepEqual(resolveTokens({ b: 'red', a: 'var(--b c)' }), { b: 'red' })
      assert.equal(buildEmailBrandingCss({}, { 'text-color-base': 'var(--b c)' }), '')
    })
  })

  // Neither is a reference, and neither is an error: the scan skips it and keeps looking, which is
  // what the pattern it replaced did. Treating them as malformed would drop tokens that are fine.
  describe('text that only looks like a reference', () => {
    test('another function whose name happens to end in var', () => {
      assert.equal(resolveTokens({ a: 'myvar(x)' }).a, 'myvar(x)')
      assert.equal(resolveTokens({ x: 'red', a: 'myvar(1) var(--x)' }).a, 'myvar(1) red')
    })

    // `var(1px)` names no custom property, so it is not a reference by any of this module's rules and
    // travels like the arbitrary text it is. A client makes no more or less of it than of `foo(1px)`.
    test('a var() that names no custom property', () => {
      assert.equal(resolveTokens({ a: 'var(1px)' }).a, 'var(1px)')
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
