// The fs-touching half of discover.ts: walk (recursive discovery), readMeta (manifest read + mtime
// cache), compareVersions (highest-version-per-id dedupe), readArchive, readArchiveConfig,
// composeComposition and readDefaultMarker. Exercised against REAL archives written to a temp dir —
// the compose core is unit-tested separately (discover.spec.ts) with an in-memory file map.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { after, describe, test } from 'node:test'

import {
  cacheDir,
  cacheFirstSearchPath,
  composeComposition,
  discoverArchives,
  readArchive,
  readArchiveConfig,
  readDefaultMarker,
  resolveRoots,
  searchPath,
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
      data: Buffer.from(JSON.stringify({ theme: { tokens: { 'color-primary': primary } } })),
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
  assert.equal(readArchiveConfig(found.get('wir').file).theme.tokens['color-primary'], 'v12')
})

// The publish convention: `<id>.tar.gz` is the CURRENT copy (a rebuild or a backend sync overwrites
// it), `<id>-<version>.tar.gz` is immutable history. A brand rebuilt without a version bump would
// otherwise be out-ranked by the history file sitting next to it — the ambiguity the webapp's sync
// used to resolve by DELETING the loser.
test('discoverArchives prefers the current `<id>.tar.gz` over a same-version history sibling', () => {
  const base = tmp()
  // Written history-first AND named so a plain walk (sorted: '-' < '.') would reach it first.
  writeArchive(base, 'acme-1.0.0.tar.gz', { id: 'acme', version: '1.0.0', primary: 'stale' })
  writeArchive(base, 'acme.tar.gz', { id: 'acme', version: '1.0.0', primary: 'fresh' })
  const found = discoverArchives(base)
  assert.equal(found.get('acme').file, join(base, 'acme.tar.gz'))
  assert.equal(readArchiveConfig(found.get('acme').file).theme.tokens['color-primary'], 'fresh')
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
  const file = writeArchive(base, 'acme.tar.gz', { id: 'acme', version: '2.0', primary: 'x' })
  // Pinned, so both stats compare EXACTLY equal whatever timestamp resolution the filesystem has.
  const stamp = new Date(1700000000000)
  utimesSync(file, stamp, stamp)
  const first = discoverArchives(base).get('acme')

  // The only way to tell a cache HIT from a silent re-read is to make a re-read give a different
  // answer: same path, different content, mtime put back. Comparing two reads of an unchanged file
  // would pass either way.
  writeArchive(base, 'acme.tar.gz', { id: 'acme', version: '9.9', primary: 'x' })
  utimesSync(file, stamp, stamp)
  const second = discoverArchives(base).get('acme')

  assert.equal(first?.version, '2.0')
  assert.deepEqual(second, first) // 9.9 on disk was never read — the cache answered
})

test('a discover after a real change MISSES the cache (mtime is the invalidator)', () => {
  // The other half of the contract: caching that never invalidates would pass the test above too.
  const base = tmp()
  const file = writeArchive(base, 'stale.tar.gz', { id: 'stale', version: '2.0', primary: 'x' })
  utimesSync(file, new Date(1700000000000), new Date(1700000000000))
  assert.equal(discoverArchives(base).get('stale')?.version, '2.0')

  writeArchive(base, 'stale.tar.gz', { id: 'stale', version: '9.9', primary: 'x' })
  utimesSync(file, new Date(1700000001000), new Date(1700000001000))
  assert.equal(discoverArchives(base).get('stale')?.version, '9.9')
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
  assert.equal(config.theme.tokens['color-primary'], 'green')
  assert.equal(config.metadata.applicationName, 'Acme')
})

test('readDefaultMarker returns the baked default id, or "" when absent', () => {
  const base = tmp()
  assert.equal(readDefaultMarker(base), '')
  writeFileSync(join(base, 'DEFAULT'), 'acme\n')
  assert.equal(readDefaultMarker(base), 'acme')
})

// The ORDERED search path. Precedence is a lookup rule: an earlier root shadows a later one, so a
// writable sync cache can out-rank read-only baked archives (and a developer's freshly built brand can
// out-rank the cache) without anything being deleted to make room.
describe('search path', () => {
  test('resolveRoots splits, trims, absolutises and collapses repeats to the first position', () => {
    assert.deepEqual(resolveRoots(`  a ${delimiter}${delimiter}b${delimiter}a `), [
      resolve('a'),
      resolve('b'),
    ])
    assert.deepEqual(resolveRoots(['a', 'b']), [resolve('a'), resolve('b')])
    // Nothing configured (or a non-string) is not an error — it is "no roots".
    assert.deepEqual(resolveRoots(undefined), [])
    assert.deepEqual(resolveRoots(''), [])
    assert.deepEqual(resolveRoots([null, 42, 'a']), [resolve('a')])
  })

  test('an earlier root wins for its ids EVEN with a lower version, and both stay on disk', () => {
    const cache = tmp()
    const baked = tmp()
    writeArchive(cache, 'acme.tar.gz', { id: 'acme', version: '1.0.0', primary: 'synced' })
    const bakedFile = writeArchive(baked, 'acme-9.9.9.tar.gz', {
      id: 'acme',
      version: '9.9.9',
      primary: 'baked',
    })

    const found = discoverArchives(`${cache}${delimiter}${baked}`)

    assert.equal(found.get('acme').version, '1.0.0')
    assert.equal(readArchiveConfig(found.get('acme').file).theme.tokens['color-primary'], 'synced')
    // The shadowed archive is untouched — precedence never mutates the filesystem.
    assert.ok(readArchive(bakedFile))
  })

  test('a later root still contributes the ids no earlier root provides', () => {
    const first = tmp()
    const second = tmp()
    writeArchive(first, 'acme.tar.gz', { id: 'acme' })
    writeArchive(second, 'acme.tar.gz', { id: 'acme' })
    writeArchive(second, 'yunite.tar.gz', { id: 'yunite' })

    const found = discoverArchives([first, second])

    assert.deepEqual([...found.keys()].sort(), ['acme', 'yunite'])
    assert.equal(found.get('acme').file, join(first, 'acme.tar.gz'))
    assert.equal(found.get('yunite').file, join(second, 'yunite.tar.gz'))
  })

  test('readDefaultMarker answers from the first root that carries a NON-EMPTY marker', () => {
    const cache = tmp()
    const baked = tmp()
    writeFileSync(join(baked, 'DEFAULT'), 'baked\n')
    // No marker in the cache yet → the image's baked default still answers.
    assert.equal(readDefaultMarker([cache, baked]), 'baked')
    // A blank marker is not an answer either (it names no brand) — keep looking.
    writeFileSync(join(cache, 'DEFAULT'), '\n')
    assert.equal(readDefaultMarker([cache, baked]), 'baked')
    // Once the sync mirrors the backend's default, it wins.
    writeFileSync(join(cache, 'DEFAULT'), 'synced\n')
    assert.equal(readDefaultMarker([cache, baked]), 'synced')
  })

  // Nothing has to be configured for branding to work: the same directory name is used in an image
  // (baked next to the app) and in a repo checkout (one level up), and both are always tried — a root
  // that does not exist costs one failed readdir.
  test('searchPath falls back to the conventional locations, and a configured path replaces them', () => {
    assert.deepEqual(searchPath(''), [
      resolve('deployment/configurations'),
      resolve('../deployment/configurations'),
    ])
    assert.deepEqual(searchPath(undefined), searchPath(''))
    assert.deepEqual(searchPath('/mnt/brands'), [resolve('/mnt/brands')])
  })

  // The cache mirrors the backend — the single source of truth for which brands exist — so it has to
  // out-rank anything found locally, and its position is deliberately NOT configurable.
  test('cacheFirstSearchPath puts the cache first, whatever the read path says', () => {
    assert.deepEqual(cacheFirstSearchPath('', ''), [
      resolve('.branding-cache'),
      resolve('deployment/configurations'),
      resolve('../deployment/configurations'),
    ])
    assert.deepEqual(cacheFirstSearchPath('/var/cache', '/mnt/brands'), [
      resolve('/var/cache'),
      resolve('/mnt/brands'),
    ])
    // A read path that repeats the cache does not demote it — dedupe keeps the first position.
    assert.deepEqual(cacheFirstSearchPath('/var/cache', `/mnt/brands${delimiter}/var/cache`), [
      resolve('/var/cache'),
      resolve('/mnt/brands'),
    ])
    assert.equal(cacheDir(''), resolve('.branding-cache'))
    assert.equal(cacheDir('/var/cache'), resolve('/var/cache'))
  })

  test('the cache genuinely shadows a baked archive of the same id', () => {
    const cache = tmp()
    const baked = tmp()
    writeArchive(cache, 'acme.tar.gz', { id: 'acme', version: '1.0.0', primary: 'synced' })
    writeArchive(baked, 'acme.tar.gz', { id: 'acme', version: '2.0.0', primary: 'baked' })

    const found = discoverArchives(cacheFirstSearchPath(cache, baked))

    assert.equal(readArchiveConfig(found.get('acme').file).theme.tokens['color-primary'], 'synced')
  })

  test('composeComposition resolves slots across roots', () => {
    const first = tmp()
    const second = tmp()
    writeArchive(first, 'ya.tar.gz', { id: 'ya', primary: 'green', appName: 'Yunite' })
    writeArchive(second, 'ac.tar.gz', { id: 'ac', primary: 'blue', appName: 'Acme' })

    const config = composeComposition(`${first}${delimiter}${second}`, {
      _default: 'ya',
      identity: 'ac',
    })

    assert.equal(config.theme.tokens['color-primary'], 'green')
    assert.equal(config.metadata.applicationName, 'Acme')
  })
})
