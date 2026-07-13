// Archive read/compose tests — composeArchive is the path that REPLACED the merged branding.json:
// consumers now read manifest.json + fragments and compose. Uses an in-memory file map (no fs / tar).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { composeArchive, composeFromArchives, readManifest } from '../dist/discover.js'
import { brandingDefaults } from '../dist/defaults.js'

// Build a synthetic archive file map: a manifest + fragment files. `themes` may add extra theme
// instances (name → cssVars primary colour) to exercise multiple-of-same-type.
function archive({
  id = 'acme',
  version = null,
  schemaVersion = '1.2.3',
  themes = { default: 'green' },
  appName = 'Acme',
} = {}) {
  const files = new Map()
  const instances = []
  for (const [name, primary] of Object.entries(themes)) {
    const file = `fragments/theme.${name}.json`
    files.set(
      file,
      Buffer.from(JSON.stringify({ theme: { cssVars: { 'color-primary': primary } }, metadata: { themeColor: primary } })),
    )
    instances.push({ type: 'theme', name, file })
  }
  files.set('fragments/identity.default.json', Buffer.from(JSON.stringify({ metadata: { applicationName: appName } })))
  instances.push({ type: 'identity', name: 'default', file: 'fragments/identity.default.json' })
  files.set(
    'manifest.json',
    Buffer.from(JSON.stringify({ id, version, schemaVersion, label: appName, instances })),
  )
  return files
}

test('readManifest returns null when the manifest is missing', () => {
  assert.equal(readManifest(new Map()), null)
})

test('readManifest surfaces the schemaVersion (branding package version) baked at build', () => {
  assert.equal(readManifest(archive({ schemaVersion: '0.0.1' })).schemaVersion, '0.0.1')
})

test('composeArchive composes the default instances and attaches the manifest id', () => {
  const config = composeArchive(archive())
  assert.equal(config.id, 'acme')
  assert.equal(config.theme.cssVars['color-primary'], 'green')
  assert.equal(config.metadata.themeColor, 'green')
  assert.equal(config.metadata.applicationName, 'Acme')
  // a bucket type the archive does not provide → framework default
  assert.equal(config.group.nameLengthMax, brandingDefaults.group.nameLengthMax)
})

test('composeArchive selection picks a non-default instance of the same type', () => {
  const files = archive({ themes: { default: 'green', dark: 'black', light: 'white' } })
  assert.equal(composeArchive(files).theme.cssVars['color-primary'], 'green') // default
  assert.equal(composeArchive(files, { theme: 'dark' }).theme.cssVars['color-primary'], 'black')
  assert.equal(composeArchive(files, { theme: 'light' }).theme.cssVars['color-primary'], 'white')
})

test('composeArchive falls back to default when a selected instance is absent', () => {
  const config = composeArchive(archive(), { theme: 'nonexistent' })
  // no matching instance → that slot uses the framework default (empty theme), NOT a crash
  assert.deepEqual(config.theme.cssVars, brandingDefaults.theme.cssVars)
})

test('composeArchive returns null for an archive without a manifest', () => {
  assert.equal(composeArchive(new Map([['fragments/theme.default.json', Buffer.from('{}')]])), null)
})

test('composeFromArchives: theme from one archive, identity from another (the headline)', () => {
  const A = archive({ id: 'ya', themes: { default: 'green' }, appName: 'Yunite' })
  const B = archive({ id: 'ac', themes: { default: 'blue' }, appName: 'Acme' })
  const getFiles = (id) => ({ ya: A, ac: B })[id] ?? null

  const composed = composeFromArchives(getFiles, { _default: 'ya', identity: 'ac' })
  assert.equal(composed.theme.cssVars['color-primary'], 'green') // theme from _default (ya)
  assert.equal(composed.metadata.themeColor, 'green') // themeColor rides with theme
  assert.equal(composed.metadata.applicationName, 'Acme') // identity slot overridden → ac
})

test('composeFromArchives: _default fills unspecified slots; an unknown id → framework default', () => {
  const A = archive({ id: 'ya', themes: { default: 'green' }, appName: 'Yunite' })
  const getFiles = (id) => ({ ya: A })[id] ?? null

  const c = composeFromArchives(getFiles, { _default: 'ya', theme: 'missing' })
  assert.equal(c.metadata.applicationName, 'Yunite') // identity from _default
  assert.deepEqual(c.theme.cssVars, brandingDefaults.theme.cssVars) // unknown theme id → default
})

test('composeFromArchives selects a named instance for a slot (id/name)', () => {
  const A = archive({ id: 'ya', themes: { default: 'green', dark: 'black' }, appName: 'Yunite' })
  const getFiles = (id) => ({ ya: A })[id] ?? null

  const c = composeFromArchives(getFiles, { _default: 'ya', theme: 'ya/dark' })
  assert.equal(c.theme.cssVars['color-primary'], 'black')
})

test('composeFromArchives merges locales from a PARTIALLY-pulled bucket (the missing-strings fix)', () => {
  // Archive Y ships a navigation instance whose fragment carries Y's menu strings (locales). Pulling
  // ONLY navigation from Y must still bring those strings in, or the menu idents resolve to nothing.
  const Y = new Map()
  Y.set(
    'fragments/navigation.default.json',
    Buffer.from(
      JSON.stringify({
        headerMenu: { menu: [{ nameIdent: 'y.home' }] },
        locales: { de: { y: { home: 'Start' } } },
      }),
    ),
  )
  Y.set(
    'manifest.json',
    Buffer.from(
      JSON.stringify({
        id: 'y',
        version: null,
        label: 'Y',
        instances: [{ type: 'navigation', name: 'default', file: 'fragments/navigation.default.json' }],
      }),
    ),
  )
  const getFiles = (id) => ({ y: Y })[id] ?? null

  const composed = composeFromArchives(getFiles, { navigation: 'y' })
  assert.equal(composed.headerMenu.menu[0].nameIdent, 'y.home')
  assert.deepEqual(composed.locales, { de: { y: { home: 'Start' } } })
})
