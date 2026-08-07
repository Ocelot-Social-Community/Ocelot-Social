#!/usr/bin/env node
/* eslint-disable no-console -- a CLI reporter: stdout/stderr IS its output channel. The sibling
   scripts in this folder silence the same rule per call; once per file says the same thing. */
/**
 * Guards the design-token system against the two ways it silently erodes.
 *
 * 1. A colour literal written where a token holds the SAME colour. It looks right in vanilla and is
 *    wrong for every brand — `#17b53f` in TabNavigation.vue was exactly this: the vanilla value of
 *    --color-primary, hard-coded, so a rebranded instance kept ocelot green on its active tab.
 * 2. A leftover `$scss-variable` in a plain CSS block. Since `styleResources` is gone these resolve to
 *    nothing; PostCSS passes the literal through and the browser drops the whole declaration. Twice
 *    found in review, both times invisible until someone looked at that exact element.
 *
 * A deliberate non-goal: colours that have NO token yet (transparencies, one-off greys). Those need a
 * new token first, which is a design decision — the check reports them as a count and moves on.
 *
 * Not stylelint: this is two rules over .vue <style> blocks, and stylelint would mean a second lint
 * toolchain plus a config to keep in sync with the token file. Same reasoning as
 * packages/ui/scripts/check-completeness.ts.
 */
const { readFileSync, readdirSync, statSync } = require('fs')
const { join, relative } = require('path')

const ROOT = join(__dirname, '..')
const TOKEN_DIR = join(ROOT, 'assets/css')

/** Every `--token: value` pair declared in assets/css, comments stripped. */
function readTokens() {
  const tokens = {}
  for (const file of readdirSync(TOKEN_DIR).filter((f) => f.endsWith('.css'))) {
    const src = readFileSync(join(TOKEN_DIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [, name, value] of src.matchAll(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
      tokens[name] = value.trim().replace(/\s+/g, ' ')
    }
  }
  return tokens
}

/**
 * `#abc`, `#aabbcc`, `rgb(...)`, `white`, `black` → `r,g,b`, or null when it is not a plain OPAQUE
 * colour. Anything carrying alpha returns null on purpose: `rgba(255,255,255,0.3)` is a translucent
 * white, and pointing it at the opaque `--color-neutral-100` would be wrong advice — that case needs
 * `color-mix()` or a token of its own.
 */
function toRgb(raw) {
  const value = raw.trim().toLowerCase()
  if (value === 'white') return '255,255,255'
  if (value === 'black') return '0,0,0'
  if (/^rgba?\((?:[^,)]+[,\s]+){3}/.test(value)) return null // 4th component ⇒ alpha
  if (/^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/.test(value)) return null // #rgba / #rrggbbaa
  const short = value.match(/^#([0-9a-f]{3})$/)
  const hex = short
    ? short[1]
        .split('')
        .map((c) => c + c)
        .join('')
    : (value.match(/^#([0-9a-f]{6})$/) || [])[1]
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')
  const rgb = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  return rgb ? `${rgb[1]},${rgb[2]},${rgb[3]}` : null
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.nuxt' || entry === 'coverage' || entry === 'dist') {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.vue')) out.push(full)
  }
  return out
}

/** Maps `r,g,b` → the token that holds it, so a literal can be pointed at its token. */
function indexByRgb(tokens) {
  const byRgb = {}
  for (const [name, value] of Object.entries(tokens)) {
    const rgb = toRgb(value)
    // First name wins: the primitives (--color-neutral-*) are declared before the semantic aliases,
    // and the primitive is what a literal should point at.
    if (rgb && !byRgb[rgb]) byRgb[rgb] = name
  }
  return byRgb
}

const COLOUR = /(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b)/g

/**
 * Every `prop: value` in a CSS body, as declarations rather than as lines.
 *
 * Splitting on newlines was the earlier approach and it read past anything wrapped — a `box-shadow`
 * or `transition` broken over two lines hid every colour after the first one, which is precisely
 * where multi-line values occur. So the value runs to the `;` (or the closing `}` of the last
 * declaration in a block) however many lines that takes.
 *
 * Requiring that terminator is also what keeps selectors out: `a:hover {` looks like `prop: value`
 * until you notice it ends in `{`, and `@media (min-width: 768px) {` likewise.
 */
function declarations(body) {
  const found = []
  for (const [, prop, value] of body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/([-a-zA-Z][-a-zA-Z0-9]*)\s*:\s*([^;{}]*)(?=[;}])/g)) {
    found.push({ prop, value: value.trim() })
  }
  return found
}

/**
 * The plain-CSS `<style>` bodies of a .vue file — `lang="scss"` blocks are somebody else's problem.
 *
 * The quotes are optional because HTML and the Vue SFC parser both accept `lang=scss` bare. Nothing in
 * this repo writes it that way and prettier would requote it, but missing one is the expensive
 * direction: the block would be read as plain CSS and every `$variable` in it reported as a leftover.
 */
const SCSS_BLOCK = /<style[^>]*\blang=(?:"s[ac]ss"|'s[ac]ss'|s[ac]ss(?=[\s/>]|$))/

function styleBodies(src) {
  return (src.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).filter(
    (block) => !SCSS_BLOCK.test(block),
  )
}

/** Both rules, over one file's source. `untokenised` counts literals that have no token to suggest. */
function checkSource(src, byRgb, rel) {
  const errors = []
  let untokenised = 0
  for (const body of styleBodies(src)) {
    for (const { prop, value } of declarations(body)) {
      if (prop.startsWith('white-space')) continue

      for (const [, name] of value.matchAll(/\$([a-z][a-z0-9-]*)/gi)) {
        errors.push(`${rel}: $${name} — SCSS variable in a plain CSS block, resolves to nothing`)
      }
      if (prop.startsWith('--')) continue // declaring a token is allowed to use a literal
      for (const [raw] of value.matchAll(COLOUR)) {
        const rgb = toRgb(raw)
        if (!rgb) continue
        if (byRgb[rgb]) errors.push(`${rel}: ${raw} — use var(--${byRgb[rgb]}) instead`)
        else untokenised += 1
      }
    }
  }
  return { errors, untokenised }
}

function main() {
  const byRgb = indexByRgb(readTokens())
  const errors = []
  let untokenised = 0

  for (const file of walk(ROOT)) {
    const result = checkSource(readFileSync(file, 'utf8'), byRgb, relative(ROOT, file))
    errors.push(...result.errors)
    untokenised += result.untokenised
  }

  if (errors.length) {
    console.error(`✖ ${errors.length} problem(s):\n`)
    for (const e of errors) console.error(`  ${e}`)
    console.error(
      `\n${untokenised} further colour literal(s) have no token yet — those are not an error, ` +
        `they need a token defined first.`,
    )
    process.exit(1)
  }

  console.log(
    `✓ no hard-coded colours with a token equivalent, no SCSS leftovers ` +
      `(${untokenised} literal(s) without a token — see assets/css/root-tokens.css)`,
  )
}

if (require.main === module) main()

module.exports = { toRgb, readTokens, indexByRgb, declarations, styleBodies, checkSource }
