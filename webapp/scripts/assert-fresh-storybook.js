#!/usr/bin/env node
/* eslint-disable no-console -- a CLI guard: stderr IS how it reports the problem. */
/**
 * Refuses to run the visual regression suite against a stale storybook-static.
 *
 * The screenshots are rendered from storybook-static and from nothing else — node_modules inside
 * the test container has no influence on a single pixel. That makes a stale bundle invisible: the
 * run is green, it just asserted the wrong picture. This bit twice already. Once via
 * @ocelot-social/ui, a `file:` dependency whose dist/ is not committed: a dist/ older than OsRibbon
 * dropped the component from every PostTeaser screenshot, and the baselines recorded from it then
 * disagreed with CI. Once via a leftover storybook-static that predated a story change.
 *
 * So: compare the bundle's mtime against every source it is built from and fail loudly, naming the
 * offending file, instead of silently rendering yesterday's app.
 *
 * Usage: node scripts/assert-fresh-storybook.js [extraSourceDir ...]
 * Extra dirs are passed in rather than hardcoded because the linked packages live at ../packages/*
 * on a host and /packages/* inside the container.
 */
const fs = require('fs')
const path = require('path')

const BUNDLE_ENTRY = 'storybook-static/index.html'
// Everything the bundle is compiled from. Relative to webapp/, plus whatever is passed on argv.
const OWN_SOURCE_DIRS = ['components', 'storybook', 'assets', 'locales', 'plugins']
// Build outputs and VCS/dependency noise: never sources, and node_modules alone would make the
// walk take longer than the build it is guarding.
const IGNORED = new Set(['node_modules', '.git', 'dist', 'storybook-static', 'coverage'])

const HOWTO =
  'Build it on the host first:\n' +
  '  cd webapp && npm run build:file-packages && npm run build-storybook\n' +
  'or run the whole thing via:\n' +
  '  cd webapp && npm run test:visual:docker'

/** Newest mtime under `dir`, plus the file it came from. Returns null for a missing dir. */
function newestUnder(dir) {
  if (!fs.existsSync(dir)) return null
  let newest = null
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      // Only regular files carry a meaningful edit time here; a dangling symlink would throw.
      if (!entry.isFile()) continue
      const { mtimeMs } = fs.statSync(full)
      if (!newest || mtimeMs > newest.mtimeMs) newest = { file: full, mtimeMs }
    }
  }
  walk(dir)
  return newest
}

function main(extraDirs) {
  if (!fs.existsSync(BUNDLE_ENTRY)) {
    console.error(`ERROR: ${BUNDLE_ENTRY} is missing — there is nothing to screenshot.\n${HOWTO}`)
    return 1
  }
  const builtAt = fs.statSync(BUNDLE_ENTRY).mtimeMs

  // `dist/` is excluded from the walk as a build output, but for the linked packages it is exactly
  // what webapp's file: dependency copies — so check those explicitly.
  const dirs = [...OWN_SOURCE_DIRS, ...extraDirs.flatMap((dir) => [dir, path.join(dir, 'dist')])]
  const stale = dirs
    .map((dir) => newestUnder(dir))
    .filter((newest) => newest && newest.mtimeMs > builtAt)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]

  if (stale) {
    console.error(
      `ERROR: ${BUNDLE_ENTRY} is older than the sources it was built from, so the screenshots ` +
        `would assert an outdated app.\n` +
        `  newest source: ${stale.file} (${new Date(stale.mtimeMs).toISOString()})\n` +
        `  bundle:        ${BUNDLE_ENTRY} (${new Date(builtAt).toISOString()})\n${HOWTO}`,
    )
    return 1
  }
  return 0
}

// CLI entry point; the spec exercises main() directly (it cannot call process.exit in-process).
/* istanbul ignore next */
if (require.main === module) {
  process.exit(main(process.argv.slice(2)))
}

module.exports = { main, newestUnder }
