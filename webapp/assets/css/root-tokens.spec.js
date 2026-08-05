/**
 * Guards the ONE window in which a design token has two sources of truth.
 *
 * root-tokens.css declares the tokens as `:root` custom properties; the SCSS prelude that
 * nuxt.config.js still injects via `styleResources` declares the same names as `$variables`, because
 * the components not yet converted to plain CSS resolve their `$token` references through it. Both
 * describe the same values — nothing enforces that, which is exactly what this spec is for. A change
 * to only one side would leave converted and unconverted components rendering different values, a
 * difference that is visible but very hard to attribute.
 *
 * TEMPORARY BY DESIGN. When the last `<style lang="scss">` block is gone the SCSS files go with it,
 * and this spec must be deleted along with them — it fails loudly rather than silently passing if
 * they disappear, so it cannot rot into a no-op.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const WEBAPP = join(__dirname, '..', '..')

// The order nuxt.config.js feeds them to style-resources-loader. Later files win, exactly as they do
// in the compiled stylesheet, so the EFFECTIVE value is the last definition of a name.
const SCSS_CHAIN = [
  'assets/_new/styles/uses.scss',
  'assets/_new/styles/_styleguide-tokens.scss',
  'assets/_new/styles/tokens.scss',
  'assets/styles/imports/_branding.scss',
  'assets/_new/styles/export.scss',
].map((p) => join(WEBAPP, p))

const CSS_FILE = join(WEBAPP, 'assets/css/root-tokens.css')

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
// Surrounding quotes are stripped because the SCSS side carries a few values as Sass STRINGS rather
// than as the value itself (`$chat-sidemenu-background-over: '#f6f6f6'`). That quoting is a quirk of
// the file this spec is temporarily guarding, not a difference in the value being described.
const normalise = (value) =>
  value
    .replace(/!default\s*$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(['"])(.*)\1$/, '$2')

/** A value we can compare textually: no reference to another variable on either side. */
const isLiteral = (value) => !value.includes('$') && !value.includes('var(')

function effectiveScssTokens() {
  const tokens = {}
  for (const file of SCSS_CHAIN) {
    if (!existsSync(file)) continue // _branding.scss is optional in a vanilla checkout
    const src = stripComments(readFileSync(file, 'utf8'))
    for (const [, name, value] of src.matchAll(/^\s*\$([a-z0-9-]+):\s*([^;]+);/gm)) {
      tokens[name] = normalise(value)
    }
  }
  return tokens
}

function cssTokens() {
  const src = stripComments(readFileSync(CSS_FILE, 'utf8'))
  const tokens = {}
  for (const [, name, value] of src.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)) {
    tokens[name] = normalise(value)
  }
  return tokens
}

describe('design tokens: CSS custom properties vs the transitional SCSS prelude', () => {
  it('still has both sources — delete this spec once the SCSS prelude is gone', () => {
    const missing = SCSS_CHAIN.filter((f) => !existsSync(f) && !f.endsWith('_branding.scss'))
    expect(missing).toEqual([])
  })

  const scss = effectiveScssTokens()
  const css = cssTokens()
  const comparable = Object.keys(css)
    .filter((name) => name in scss)
    .filter((name) => isLiteral(css[name]) && isLiteral(scss[name]))

  // Without this the suite would keep passing if the parsing broke or the naming diverged wholesale
  // — the failure mode of every "compare two files" test.
  it('finds a substantial set of tokens to compare', () => {
    expect(comparable.length).toBeGreaterThan(50)
  })

  it('agrees on every value defined literally on both sides', () => {
    const drifted = comparable
      .filter((name) => scss[name] !== css[name])
      .map((name) => `--${name}: "${css[name]}" but $${name}: "${scss[name]}"`)
    expect(drifted).toEqual([])
  })
})
