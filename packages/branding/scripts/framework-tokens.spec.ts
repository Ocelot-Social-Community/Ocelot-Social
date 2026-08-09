// The committed framework-token snapshot. Its whole job is to be READABLE where the webapp is not, so
// what needs guarding is that it still matches the webapp — in the checkouts that have one.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { FRAMEWORK_TOKENS } from '../dist/frameworkTokens.js'

import { renderFrameworkTokens, writeFrameworkTokens } from './framework-tokens.ts'
import { catalogAvailable, computeCatalog } from './theme-catalog.ts'

const dirs: string[] = []
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

describe('framework tokens snapshot', () => {
  test('carries the tokens an e-mail theme is built from', () => {
    const tokens = FRAMEWORK_TOKENS

    // Not an arbitrary sample: these are exactly the tokens EMAIL_THEME maps onto mail selectors, and
    // a snapshot missing any of them silently produces an unbranded mail instead of a build error.
    for (const name of [
      'color-primary',
      'color-primary-inverse',
      'text-color-link',
      'text-color-base',
      'text-color-soft',
      'font-family-text',
    ]) {
      assert.ok(tokens[name], `missing token: ${name}`)
    }
  })

  test('keeps values RAW, so a brand override still propagates through them', () => {
    // Pre-resolving would bake the framework's own primary into every derived token, and no brand
    // could move it any more.
    assert.equal(FRAMEWORK_TOKENS['text-color-link'], 'var(--color-primary)')
  })

  // The drift guard, REGISTERED only where the webapp can be read. A brand repo has no webapp beside
  // it — that absence is the reason this snapshot exists — so there the check simply does not run;
  // it runs in this repository, which is the only place the stylesheets change.
  if (catalogAvailable()) {
    test('matches the webapp stylesheets it was generated from', () => {
      assert.deepEqual(
        FRAMEWORK_TOKENS,
        computeCatalog(),
        'src/frameworkTokens.generated.ts is stale — run `npm run tokens:snapshot`',
      )
    })

    // The VALUES agreeing is not enough: the file also has to be byte-identical to what the generator
    // writes today, or the next `npm run tokens:snapshot` produces a reformatting diff nobody asked
    // for — and a hand-edit to a generated file would survive unnoticed.
    test('is byte-identical to what the generator writes', () => {
      const committed = readFileSync(
        fileURLToPath(new URL('../src/frameworkTokens.generated.ts', import.meta.url)),
        'utf8',
      )
      assert.equal(committed, renderFrameworkTokens(computeCatalog()))
    })

    // The write path itself: it has to land on disk, at the path it reports, carrying the catalog.
    // Gated with the rest — writeFrameworkTokens() sources computeCatalog(), which is `{}` without a
    // webapp beside this package, and an ungated version of this test would fail in exactly the
    // checkouts the snapshot exists for.
    test('writes the catalog to the path it returns', () => {
      const dir = mkdtempSync(join(tmpdir(), 'ocelot-tokens-'))
      dirs.push(dir)
      const out = join(dir, 'tokens.ts')

      assert.equal(writeFrameworkTokens(out), out)
      assert.equal(readFileSync(out, 'utf8'), renderFrameworkTokens(computeCatalog()))
    })
  }

  // Sorted rendering, checked against the RENDERER — a pure function of its argument, so this holds
  // wherever the package is checked out. Feeding it an already-sorted map would prove nothing.
  test('renders entries sorted, so a regenerated file diffs by value and not by readdir order', () => {
    const rendered = renderFrameworkTokens({
      'color-primary': 'red',
      'background-color-base': 'white',
      'text-color-base': 'black',
    })

    const names = [...rendered.matchAll(/^ {2}'([^']+)':/gm)].map((m) => m[1])
    assert.deepEqual(names, ['background-color-base', 'color-primary', 'text-color-base'])
  })

  // A value carrying an apostrophe (font stacks: `'LatoWeb', sans-serif`) must not end the string it
  // sits in. Prettier switches such a literal to double quotes, and so does the generator — matching
  // it is what keeps the generated file lint-clean without disabling anything.
  test('quotes a value containing an apostrophe the way prettier would', () => {
    const rendered = renderFrameworkTokens({ 'font-family-text': "'LatoWeb', sans-serif" })

    assert.match(rendered, /'font-family-text': "'LatoWeb', sans-serif",/)
  })
})
