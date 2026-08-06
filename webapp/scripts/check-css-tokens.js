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

const tokens = readTokens()
const byRgb = {}
for (const [name, value] of Object.entries(tokens)) {
  const rgb = toRgb(value)
  // First name wins: the primitives (--color-neutral-*) are declared before the semantic aliases, and
  // the primitive is what a literal should point at.
  if (rgb && !byRgb[rgb]) byRgb[rgb] = name
}

const COLOUR = /(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b)/g
const DECLARATION = /^(\s*[-a-zA-Z][-a-zA-Z0-9]*\s*:\s*)(.+?)(;?\s*)$/

const errors = []
let untokenised = 0

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file)
  const src = readFileSync(file, 'utf8')
  for (const block of src.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []) {
    if (/<style[^>]*\blang=["']s[ac]ss["']/.test(block)) continue
    const body = block.replace(/\/\*[\s\S]*?\*\//g, '')
    body.split('\n').forEach((line, i) => {
      const decl = DECLARATION.exec(line)
      if (!decl) return
      const prop = decl[1].trim().replace(/:$/, '').trim()
      if (prop.startsWith('white-space')) return
      const value = decl[2]

      for (const [, name] of value.matchAll(/\$([a-z][a-z0-9-]*)/gi)) {
        errors.push(`${rel}: $${name} — SCSS variable in a plain CSS block, resolves to nothing`)
      }
      if (prop.startsWith('--')) return // declaring a token is allowed to use a literal
      for (const [raw] of value.matchAll(COLOUR)) {
        const rgb = toRgb(raw)
        if (!rgb) continue
        if (byRgb[rgb]) {
          errors.push(`${rel}: ${raw} — use var(--${byRgb[rgb]}) instead`)
        } else {
          untokenised += 1
        }
      }
    })
  }
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
