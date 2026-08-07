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
    // `scripts` excluded on purpose: these CLI tools are not rendered by anything.
    if (
      ['node_modules', '.nuxt', 'coverage', 'dist', 'storybook-static', 'scripts'].includes(entry)
    ) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

/**
 * Drops comments, so that a class named in prose cannot vouch for itself.
 *
 * That is the check's one silent failure mode: `.user-teaser` outlived its template in a doc comment
 * that still spelled it out, and a grep over raw source would have called it live.
 *
 * Only comments occupying a WHOLE LINE are removed — which documentation and commented-out code, the
 * things that actually name dead classes, always do. A trailing `// ...` is deliberately left alone:
 * `//` also occurs mid-line inside URLs, and eating the rest of `<a href="https:` + `//x" class="c">`
 * would report `.c` as dead while it renders on every page. Anchoring block comments to the start of
 * a line buys the same protection against path globs, whose slash-star would otherwise open a comment
 * that swallows the real code following it.
 *
 * Both holes fail safe in the same direction they always did: towards trusting a class, never towards
 * flagging a live one.
 */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '') // template comments
    .replace(/^[ \t]*\/\/.*$/gm, '') // whole-line line comments
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '') // block comments opening their own line
}

/** Every class the brand's stylesheet targets, comments excluded. */
function brandClasses(src) {
  const selectors = [...stripComments(src).matchAll(/([^{}@]+)\{/g)].map((m) => m[1])
  const classes = new Set()
  for (const sel of selectors) {
    for (const [, cls] of sel.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(cls)
  }
  return classes
}

/** Whether `haystack` mentions `cls` as a class rather than as the prefix of a longer one. */
function isRendered(cls, haystack) {
  if (DYNAMIC_PREFIXES.some((p) => cls.startsWith(p))) return true
  if (VENDOR_PREFIXES.some((p) => cls.startsWith(p))) return true
  // Word boundary on both sides: `.user-avatar` must not be satisfied by `user-avatar-popover`.
  return new RegExp(`(^|[\\s"'.\`\\[])${cls}($|[\\s"'.:,\`\\]])`).test(haystack)
}

/** Everything the webapp could plausibly render: templates, its own stylesheets, the UI library's CSS. */
function buildHaystack() {
  let haystack = ''
  // .css too: ds-compat.css and friends define utility classes the templates only reference
  // through a variable, so a class can be live without appearing literally in a template.
  for (const f of walk(WEBAPP, ['.vue', '.js', '.css']))
    haystack += stripComments(readFileSync(f, 'utf8'))
  for (const dir of [join(REPO, 'packages/ui/dist'), join(REPO, 'packages/ui/src')]) {
    if (!existsSync(dir)) continue
    for (const f of walk(dir, ['.css', '.vue', '.ts']))
      haystack += stripComments(readFileSync(f, 'utf8'))
  }
  return haystack
}

function main() {
  const haystack = buildHaystack()
  const problems = []
  let checked = 0

  for (const brand of readdirSync(BRANDS)) {
    const cssDir = join(BRANDS, brand, 'branding/assets/css')
    if (!existsSync(cssDir)) continue
    for (const file of readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
      for (const cls of brandClasses(readFileSync(join(cssDir, file), 'utf8'))) {
        checked += 1
        if (isRendered(cls, haystack)) continue
        problems.push(
          `${relative(REPO, join(cssDir, file))}: .${cls} — no longer rendered by the webapp`,
        )
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

  console.log(
    `✓ every brand selector matches something the webapp renders (${checked} classes checked)`,
  )
}

if (require.main === module) main()

module.exports = { stripComments, brandClasses, isRendered }
