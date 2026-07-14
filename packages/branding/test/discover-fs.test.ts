// The fs-touching half of discover.ts: walk (recursive discovery), readMeta (manifest read + mtime
// cache), compareVersions (highest-version-per-id dedupe), readArchive, readArchiveConfig,
// composeComposition and readDefaultMarker. Exercised against REAL archives written to a temp dir —
// the compose core is unit-tested separately (discover.test.mjs) with an in-memory file map.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

import {
  composeComposition,
  discoverArchives,
  readArchive,
  readArchiveConfig,
  readDefaultMarker,
} from '../dist/discover.js'
import { writeTarGz } from '../dist/tar.js'

const roots = []
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-discover-'))
  roots.push(dir)
  return dir
}
after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

// A real `<id>.tar.gz` buffer: manifest + a theme fragment (primary colour) + identity fragment (name).
function archiveGz({
  id,
  version = null,
  schemaVersion = '0.0.1',
  primary = 'green',
  appName = id,
}) {
  const instances = [
    { type: 'theme', name: 'default', file: 'fragments/theme.default.json' },
    { type: 'identity', name: 'default', file: 'fragments/identity.default.json' },
  ]
  return writeTarGz([
    {
      name: 'manifest.json',
      data: Buffer.from(JSON.stringify({ id, version, schemaVersion, label: appName, instances })),
    },
    {
      name: 'fragments/theme.default.json',
      data: Buffer.from(JSON.stringify({ theme: { cssVars: { 'color-primary': primary } } })),
    },
    {
      name: 'fragments/identity.default.json',
      data: Buffer.from(JSON.stringify({ metadata: { applicationName: appName } })),
    },
  ])
}

function writeArchive(dir, name, opts) {
  const full = join(dir, name)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, archiveGz(opts))
  return full
}

test('discoverArchives finds *.tar.gz recursively and keys them by manifest id', () => {
  const base = tmp()
  writeArchive(base, 'acme/dist/acme.tar.gz', { id: 'acme', primary: 'red' })
  writeArchive(base, 'nested/deep/yunite.tar.gz', { id: 'yunite', primary: 'blue' })
  const found = discoverArchives(base)
  assert.deepEqual([...found.keys()].sort(), ['acme', 'yunite'])
  assert.equal(found.get('acme').id, 'acme')
  // the schema version the archive was built with is surfaced for compat checks
  assert.equal(found.get('acme').schemaVersion, '0.0.1')
})

test('discoverArchives dedupes duplicate ids to the HIGHEST version', () => {
  const base = tmp()
  writeArchive(base, 'wir-1.1.tar.gz', { id: 'wir', version: '1.1', primary: 'v11' })
  writeArchive(base, 'a/wir-1.2.tar.gz', { id: 'wir', version: '1.2', primary: 'v12' })
  writeArchive(base, 'b/wir.tar.gz', { id: 'wir', version: '1.2', primary: 'v12' }) // "latest" copy
  const found = discoverArchives(base)
  assert.equal(found.size, 1)
  assert.equal(found.get('wir').version, '1.2')
  // and the winning file composes to the 1.2 theme
  assert.equal(readArchiveConfig(found.get('wir').file).theme.cssVars['color-primary'], 'v12')
})

test('discoverArchives treats numerically-equal versions as equal (1.2 == 1.2.0 → deduped)', () => {
  const base = tmp()
  writeArchive(base, 'a/x-1.2.tar.gz', { id: 'x', version: '1.2' })
  writeArchive(base, 'b/x-1.2.0.tar.gz', { id: 'x', version: '1.2.0' })
  // compareVersions runs its full loop (no early `a===b`) and returns 0 → the first-seen wins, size 1
  assert.equal(discoverArchives(base).size, 1)
})

test('discoverArchives skips a broken symlink named *.tar.gz (stat throws → treated as absent)', () => {
  const base = tmp()
  writeArchive(base, 'good.tar.gz', { id: 'good' })
  symlinkSync(join(base, 'does-not-exist'), join(base, 'broken.tar.gz')) // dangling → statSync throws
  assert.deepEqual([...discoverArchives(base).keys()], ['good'])
})

test('discoverArchives skips node_modules, dotdirs and stray/garbled .tar.gz files', () => {
  const base = tmp()
  writeArchive(base, 'good.tar.gz', { id: 'good' })
  writeArchive(base, 'node_modules/dep.tar.gz', { id: 'skipme-nm' })
  writeArchive(base, '.hidden/x.tar.gz', { id: 'skipme-dot' })
  writeFileSync(join(base, 'garbage.tar.gz'), Buffer.from('not a gzip'))
  const found = discoverArchives(base)
  assert.deepEqual([...found.keys()], ['good'])
})

test('discoverArchives returns an empty map for a missing base dir (walk swallows ENOENT)', () => {
  assert.equal(discoverArchives(join(tmp(), 'does-not-exist')).size, 0)
})

test('a second discover of the same dir hits the mtime cache (same metadata)', () => {
  const base = tmp()
  writeArchive(base, 'acme.tar.gz', { id: 'acme', version: '2.0', primary: 'x' })
  const first = discoverArchives(base).get('acme')
  const second = discoverArchives(base).get('acme')
  assert.deepEqual(second, first)
})

test('readArchive returns the decompressed entries, or null for a missing file', () => {
  const base = tmp()
  const file = writeArchive(base, 'acme.tar.gz', { id: 'acme' })
  assert.ok(readArchive(file).has('manifest.json'))
  assert.equal(readArchive(join(base, 'nope.tar.gz')), null)
  // a file that exists but is not a valid gzip → null (readTarGz throws, swallowed)
  const bad = join(base, 'bad.tar.gz')
  writeFileSync(bad, Buffer.from('not gzip'))
  assert.equal(readArchive(bad), null)
})

test('composeComposition resolves a cross-archive map against the discovered library', () => {
  const base = tmp()
  writeArchive(base, 'ya/ya.tar.gz', { id: 'ya', primary: 'green', appName: 'Yunite' })
  writeArchive(base, 'ac/ac.tar.gz', { id: 'ac', primary: 'blue', appName: 'Acme' })
  // theme from _default (ya), identity slot overridden to ac
  const config = composeComposition(base, { _default: 'ya', identity: 'ac' })
  assert.equal(config.theme.cssVars['color-primary'], 'green')
  assert.equal(config.metadata.applicationName, 'Acme')
})

test('readDefaultMarker returns the baked default id, or "" when absent', () => {
  const base = tmp()
  assert.equal(readDefaultMarker(base), '')
  writeFileSync(join(base, 'DEFAULT'), 'acme\n')
  assert.equal(readDefaultMarker(base), 'acme')
})
