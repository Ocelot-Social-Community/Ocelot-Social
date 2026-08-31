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
 *
 * Copying alone is not enough, because a copied file's BARE requires resolve from
 * its new location: globUtils.js does `require("watchpack")` and, sitting in
 * webpack 4's tree, reaches webpack/node_modules/watchpack@1.7.5 instead of the
 * watchpack@2 it was written against. 1.7.5 exports no `util`, so the first glob
 * in a rule condition dies on "Cannot read properties of undefined (reading
 * 'globToRegExp')" — lazily, via memoize, so nothing fails until then. Such
 * packages are therefore linked into a node_modules/ NEXT TO the copied file, which
 * only files in that same directory can resolve. webpack 4 keeps its own copy:
 * its single watchpack user is lib/node/NodeWatchFileSystem.js, a different folder.
 */
const fs = require('fs')
const path = require('path')
const { isBuiltin } = require('module')

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
  const barePattern = /require\("([^".][^"]*)"\)/g
  const seen = new Set()
  const bare = new Set()
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
    for (const [, target] of contents.matchAll(barePattern)) {
      if (isBuiltin(target)) continue
      // Package name only — strip any deep import (`pkg/lib/x`, `@scope/pkg/lib/x`).
      const parts = target.split('/')
      bare.add(target.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0])
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

  // Link every bare dependency whose resolution differs between the source webpack 5 and the
  // copied file's new home, scoped to the directory that copied file sits in.
  const dirsWithCopies = [...new Set([...seen].map((rel) => path.dirname(rel)))]
  let linked = 0
  for (const pkg of bare) {
    let from
    try {
      from = require.resolve(`${pkg}/package.json`, { paths: [sourceLib] })
    } catch {
      continue // not resolvable from the source either — leave it alone
    }
    for (const dir of dirsWithCopies) {
      const destDir = path.join(destLib, dir)
      if (!fs.existsSync(destDir)) continue
      let to
      try {
        to = require.resolve(`${pkg}/package.json`, { paths: [destDir] })
      } catch {
        to = null
      }
      if (to === from) continue // already resolves to the same package

      const link = path.join(destDir, 'node_modules', pkg)
      if (fs.existsSync(link)) continue
      fs.mkdirSync(path.dirname(link), { recursive: true })
      fs.symlinkSync(path.relative(path.dirname(link), path.dirname(from)), link, 'junction')
      linked++
    }
  }

  if (linked > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `Linked ${linked} package(s) next to the copied files so they resolve webpack 5's versions`,
    )
  }
}
