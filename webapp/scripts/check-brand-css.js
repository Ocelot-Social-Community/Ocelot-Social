#!/usr/bin/env node
/* eslint-disable no-console -- a CLI reporter: stdout/stderr IS its output channel. */
/**
 * Holds every brand's custom stylesheet against the classes the webapp actually renders.
 *
 * A brand styles the app from the outside, by selector. Nothing links the two: rename a component's
 * class and the brand's rule stops matching — silently, on a page nobody on the framework side looks
 * at. That is not hypothetical. #9973 renamed UserTeaser → UserAvatar and ProfileAvatar → AvatarImage;
 * four brands kept styling `.user-teaser` and `.profile-avatar`, and their avatars quietly lost their
 * branding. Before that, the ds-* wrappers were migrated to plain HTML and left the same kind of
 * residue behind.
 *
 * The check is one-directional on purpose: it flags classes a brand targets that the webapp does not
 * render. It says nothing about whether the RULE is still a good idea — only that it can still match.
 *
 * Dynamic classes: `mixins/seo.js` builds `page-name-${route.name}` at runtime, so no source file
 * contains the literal `page-name-login`. Prefixes that are assembled rather than written are listed
 * in DYNAMIC_PREFIXES; anything matching one is trusted.
 */
const { readFileSync, readdirSync, statSync, existsSync } = require('fs')
const { join, relative } = require('path')

const WEBAPP = join(__dirname, '..')
const REPO = join(WEBAPP, '..')
const BRANDS = join(REPO, 'deployment/configurations')

/** Class prefixes the app composes at runtime — the literal never appears in a source file. */
const DYNAMIC_PREFIXES = ['page-name-']

/** Third-party class families the app renders through a library, not from its own templates. */
const VENDOR_PREFIXES = ['vac-', 'iziToast', 'v-popover', 'tooltip', 'trigger', 'popover']

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    // `scripts` excluded on purpose: these CLI tools are not rendered, and this file NAMES the very
    // classes it hunts for in its own header comment — without this it vouches for them itself.
    if (['node_modules', '.nuxt', 'coverage', 'dist', 'storybook-static', 'scripts'].includes(entry)) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

// Everything the webapp could plausibly render: templates, its own stylesheets, the UI library's CSS.
let haystack = ''
// .css too: ds-compat.css and friends define utility classes the templates only reference
// through a variable, so a class can be live without appearing literally in a template.
for (const f of walk(WEBAPP, ['.vue', '.js', '.css'])) haystack += readFileSync(f, 'utf8')
for (const dir of [join(REPO, 'packages/ui/dist'), join(REPO, 'packages/ui/src')]) {
  if (existsSync(dir)) for (const f of walk(dir, ['.css', '.vue', '.ts'])) haystack += readFileSync(f, 'utf8')
}

const problems = []
let checked = 0

for (const brand of readdirSync(BRANDS)) {
  const cssDir = join(BRANDS, brand, 'branding/assets/css')
  if (!existsSync(cssDir)) continue
  for (const file of readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
    const src = readFileSync(join(cssDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectors = [...src.matchAll(/([^{}@]+)\{/g)].map((m) => m[1])
    const classes = new Set()
    for (const sel of selectors) {
      for (const [, cls] of sel.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(cls)
    }
    for (const cls of classes) {
      checked += 1
      if (DYNAMIC_PREFIXES.some((p) => cls.startsWith(p))) continue
      if (VENDOR_PREFIXES.some((p) => cls.startsWith(p))) continue
      // Word boundary on both sides: `.user-avatar` must not be satisfied by `user-avatar-popover`.
      if (new RegExp(`(^|[\\s"'.\`\\[])${cls}($|[\\s"'.:,\`\\]])`).test(haystack)) continue
      problems.push(`${relative(REPO, join(cssDir, file))}: .${cls} — no longer rendered by the webapp`)
    }
  }
}

if (problems.length) {
  console.error(`✖ ${problems.length} brand selector(s) target classes that no longer exist:\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error(
    '\nEither point the rule at the current class, or drop it — a rule that cannot match is not' +
      ' branding, it only looks like it.',
  )
  process.exit(1)
}

console.log(`✓ every brand selector matches something the webapp renders (${checked} classes checked)`)
