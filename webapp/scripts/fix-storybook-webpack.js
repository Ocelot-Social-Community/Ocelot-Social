#!/usr/bin/env node
/**
 * vue-loader@15's webpack5 plugin requires several internal webpack 5 modules
 * from webpack/lib/rules/ (BasicEffectRulePlugin, BasicMatcherRulePlugin, etc.).
 * The top-level webpack here is version 4 — @nuxt/webpack pins it and vue-loader
 * resolves it by hoisting for `nuxt build` — so the top-level webpack has no
 * lib/rules/ directory, and storybook fails with "Cannot find module" before
 * compilation even starts.
 *
 * This script copies those modules from the nested webpack 5 installed under
 * @storybook/* into the top-level webpack, so vue-loader's module resolution
 * finds the right files regardless of hoisting. `nuxt build` is unaffected: it
 * drives a webpack 4 compiler, so vue-loader takes its plugin-webpack4 path and
 * never reads any of the files added here.
 *
 * The copy set is computed as the transitive closure of relative requires rather
 * than being a fixed list of lib/rules/: webpack 5.110 added a require of
 * ../util/globUtils to RuleSetCompiler.js, which a rules-only copy misses — the
 * build then dies on "Cannot find module '../util/globUtils'". Following the
 * requires keeps this working across such bumps.
 *
 * Files already present in webpack 4 are never overwritten; webpack 4 has to keep
 * working for `nuxt build`.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const destLib = path.join(root, 'node_modules', 'webpack', 'lib')

const candidateLibs = [
  path.join(
    root,
    'node_modules',
    '@storybook',
    'preset-vue-webpack',
    'node_modules',
    'webpack',
    'lib',
  ),
  path.join(
    root,
    'node_modules',
    '@storybook',
    'builder-webpack5',
    'node_modules',
    'webpack',
    'lib',
  ),
]

const sourceLib = candidateLibs.find((p) => fs.existsSync(path.join(p, 'rules')))

if (!sourceLib) {
  // eslint-disable-next-line no-console
  console.warn(
    'fix-storybook-webpack: webpack/lib/rules/ not found in any nested storybook webpack — storybook dev may fail',
  )
} else {
  const requirePattern = /require\("(\.[^"]+)"\)/g
  const seen = new Set()
  const queue = fs
    .readdirSync(path.join(sourceLib, 'rules'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join('rules', f))

  while (queue.length > 0) {
    const rel = queue.pop()
    if (seen.has(rel)) continue
    seen.add(rel)

    const src = path.join(sourceLib, rel)
    if (!fs.existsSync(src)) continue

    const contents = fs.readFileSync(src, 'utf-8')
    for (const [, target] of contents.matchAll(requirePattern)) {
      let next = path.normalize(path.join(path.dirname(rel), target))
      if (!next.endsWith('.js')) next += '.js'
      if (!seen.has(next)) queue.push(next)
    }
  }

  let copied = 0
  for (const rel of seen) {
    const src = path.join(sourceLib, rel)
    const dest = path.join(destLib, rel)
    if (!fs.existsSync(src) || fs.existsSync(dest)) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    copied++
  }

  if (copied > 0) {
    // eslint-disable-next-line no-console
    console.log(`Copied ${copied} file(s) into top-level webpack/lib/ for vue-loader compatibility`)
  }
}
