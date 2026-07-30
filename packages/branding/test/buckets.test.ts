// Bucket taxonomy tests — run against the built dist (node --test). Import the specific dist modules
// (not the index) to avoid ESM↔CJS named-import interop through `export *`.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  bucketOfPath,
  composeConfig,
  extractBucket,
  splitConfig,
  parseSource,
  formatSource,
  isValidBrandId,
  BUCKET_NAMES,
} from '../dist/buckets.js'
import { brandingDefaults } from '../dist/defaults.js'
import { defineBranding } from '../dist/merge.js'

// Collect every leaf dot-path of a config (empty objects/arrays count as leaves).
function leaves(obj, prefix, out) {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length) {
    for (const k of Object.keys(obj)) leaves(obj[k], prefix ? `${prefix}.${k}` : k, out)
  } else {
    out.push(prefix)
  }
}

// `locales` is cross-cutting (merged from every source, carried on every fragment), not bucket-owned.
const CROSS_CUTTING = ['locales']

test('taxonomy is a TOTAL partition: every default-config leaf maps to exactly one bucket', () => {
  const paths = []
  leaves(brandingDefaults, '', paths)
  const unclaimed = paths.filter((p) => bucketOfPath(p) === null && !CROSS_CUTTING.includes(p))
  assert.deepEqual(
    unclaimed,
    [],
    `unclaimed leaves (add them to a bucket): ${unclaimed.join(', ')}`,
  )
  assert.ok(paths.length > 0)
})

test('locales are cross-cutting: merged from every source, owned by no bucket', () => {
  assert.equal(bucketOfPath('locales'), null)
  const composed = composeConfig({
    navigation: { locales: { de: { nav: { home: 'Start' } } } },
    identity: { locales: { de: { app: { title: 'App' } } } },
  })
  assert.deepEqual(composed.locales, { de: { nav: { home: 'Start' }, app: { title: 'App' } } })
})

test('splitConfig attaches locales to EVERY fragment so they survive a partial load', () => {
  const brand = defineBranding({
    locales: { de: { x: '1' } },
    headerMenu: { menu: [{ nameIdent: 'x' }] },
  })
  const frags = splitConfig(brand)
  for (const bucket of BUCKET_NAMES) {
    assert.deepEqual(frags[bucket].locales, { de: { x: '1' } })
  }
  // composing ONLY navigation from this brand still brings its strings in
  assert.deepEqual(composeConfig({ navigation: frags.navigation }).locales, { de: { x: '1' } })
})

test('grenzfall mappings: split domains land in the right bucket', () => {
  assert.equal(bucketOfPath('metadata.ogImage'), 'identity') // all of metadata is identity now
  assert.equal(bucketOfPath('metadata.applicationName'), 'identity')
  assert.equal(bucketOfPath('metadata.version'), 'identity')
  assert.equal(bucketOfPath('assets.css'), 'theme')
  assert.equal(bucketOfPath('assets.favicon'), 'logos')
  assert.equal(bucketOfPath('assets.html'), 'legal')
  assert.equal(bucketOfPath('links.pages'), 'legal')
  assert.equal(bucketOfPath('links.footerOrder'), 'navigation')
  assert.equal(bucketOfPath('links.landingPage'), 'navigation')
  assert.equal(bucketOfPath('registration.layout'), 'theme')
  assert.equal(bucketOfPath('registration.nonceLength'), 'behavior')
  assert.equal(bucketOfPath('donation'), 'theme')
  assert.equal(bucketOfPath('about'), 'identity')
})

test('unknown path maps to no bucket', () => {
  assert.equal(bucketOfPath('nope'), null)
  assert.equal(bucketOfPath('metadata'), 'identity') // a domain itself resolves
})

const brandA = defineBranding({
  metadata: { applicationName: 'A-app' },
  group: { nameLengthMax: 40 },
  theme: { cssVars: { 'color-primary': 'blue' } },
})
const brandB = defineBranding({
  metadata: { applicationName: 'B-app' },
  theme: { cssVars: { 'color-primary': 'green' } },
})

test('composeConfig round-trips: all buckets from one brand equals that brand', () => {
  const allA = Object.fromEntries(BUCKET_NAMES.map((b) => [b, brandA]))
  assert.deepEqual(composeConfig(allA), brandA)
})

test('cross-brand: theme(B) + everything-else(A) — the headline reuse case', () => {
  const composed = composeConfig({
    theme: brandB,
    identity: brandA,
    logos: brandA,
    legal: brandA,
    navigation: brandA,
    behavior: brandA,
  })
  assert.equal(composed.theme.cssVars['color-primary'], 'green') // look from B
  assert.equal(composed.metadata.applicationName, 'A-app') // identity from A
  assert.equal(composed.group.nameLengthMax, 40) // behavior from A
})

test('sparse compose: buckets without a source fall back to framework defaults', () => {
  const composed = composeConfig({ theme: brandB })
  assert.equal(composed.theme.cssVars['color-primary'], 'green')
  assert.equal(composed.metadata.applicationName, brandingDefaults.metadata.applicationName)
  assert.equal(composed.group.nameLengthMax, brandingDefaults.group.nameLengthMax)
})

test('sparse owned-path source keeps the default sibling leaves (deep-merge, not replace)', () => {
  // A behavior source carrying ONLY group.nameLengthMax: the other group.* leaves must stay at their
  // framework defaults, not be wiped when the `group` owned path is composed. (Build fragments are
  // full so this can't happen through them, but the DeepPartial contract + cross-brand mixing allow
  // sparse sources — this guards composeConfig against silently dropping siblings.)
  const composed = composeConfig({ behavior: { group: { nameLengthMax: 99 } } })
  assert.equal(composed.group.nameLengthMax, 99) // provided leaf wins
  assert.equal(composed.group.nameLengthMin, brandingDefaults.group.nameLengthMin) // sibling default kept
  assert.equal(composed.group.descriptionMinLength, brandingDefaults.group.descriptionMinLength)
})

test('sparse owned-path source: arrays replace wholesale, sibling default still kept', () => {
  // headerMenu.menu (array) replaces the whole list — no element-wise merge — while the sibling
  // headerMenu.customButton keeps its framework default.
  const composed = composeConfig({ navigation: { headerMenu: { menu: [{ nameIdent: 'only' }] } } })
  assert.deepEqual(composed.headerMenu.menu, [{ nameIdent: 'only' }]) // whole list replaced
  assert.deepEqual(composed.headerMenu.customButton, brandingDefaults.headerMenu.customButton)
})

test('composeConfig ignores __proto__ in a source — no prototype pollution (locales + owned path)', () => {
  // A malicious source (e.g. an uploaded brand fragment / locale file) carrying a top-level __proto__.
  // deepMergeInto must drop it, not recurse into Object.prototype.
  composeConfig({ navigation: { locales: JSON.parse('{"__proto__":{"POLLUTED_LOC":"y"}}') } })
  composeConfig({ behavior: { group: JSON.parse('{"__proto__":{"POLLUTED_OWN":"y"}}') } })
  assert.equal({}.POLLUTED_LOC, undefined)
  assert.equal({}.POLLUTED_OWN, undefined)
  // A __proto__ key alongside real data: the real sibling survives, __proto__ is dropped.
  const composed = composeConfig({
    navigation: { locales: JSON.parse('{"de":{"greet":"hi"},"__proto__":{"P":"y"}}') },
  })
  assert.equal(composed.locales.de.greet, 'hi')
  assert.deepEqual(Object.keys(composed.locales), ['de'])
})

test('parseSource / formatSource round-trip the source address grammar', () => {
  assert.deepEqual(parseSource('acme'), { id: 'acme', version: null, name: 'default' })
  assert.deepEqual(parseSource('acme@1.2.0'), { id: 'acme', version: '1.2.0', name: 'default' })
  assert.deepEqual(parseSource('acme/dark'), { id: 'acme', version: null, name: 'dark' })
  assert.deepEqual(parseSource('acme@1.2.0/dark'), { id: 'acme', version: '1.2.0', name: 'dark' })
  assert.equal(parseSource(''), null)
  assert.equal(parseSource(undefined), null)
  // '@default' (no id, only a version marker) resolves to null → framework default. The admin uses
  // it as the sentinel slot source for "framework default (vanilla)".
  assert.equal(parseSource('@default'), null)
  assert.equal(formatSource({ id: 'acme' }), 'acme')
  assert.equal(formatSource({ id: 'acme', name: 'dark' }), 'acme/dark')
  assert.equal(formatSource({ id: 'acme', version: '1.2.0', name: 'dark' }), 'acme@1.2.0/dark')
  assert.equal(formatSource({ id: '' }), '')
})

test('isValidBrandId accepts brand ids and rejects anything that could escape a path', () => {
  assert.equal(isValidBrandId('acme'), true)
  assert.equal(isValidBrandId('Acme_2.0-beta'), true)
  // The guard every server-side consumer applies before an id reaches the filesystem.
  assert.equal(isValidBrandId('../etc/passwd'), false)
  assert.equal(isValidBrandId('acme/dark'), false)
  assert.equal(isValidBrandId('acme brand'), false)
  // The two path segments that must never pass as a name — `join(dir, '..', x)` leaves `dir`.
  assert.equal(isValidBrandId('.'), false)
  assert.equal(isValidBrandId('..'), false)
  // …while an id that merely CONTAINS or starts with dots stays valid (`stage.ocelot.social`).
  assert.equal(isValidBrandId('stage.ocelot.social'), true)
  assert.equal(isValidBrandId('...'), true)
  assert.equal(isValidBrandId('.hidden'), true)
  assert.equal(isValidBrandId(''), false)
  assert.equal(isValidBrandId(undefined), false)
  assert.equal(isValidBrandId(42), false)
})

test('composeConfig does not mutate the source configs', () => {
  const before = JSON.stringify(brandB)
  composeConfig({ theme: brandB, identity: brandA })
  assert.equal(JSON.stringify(brandB), before)
})

test('extractBucket keeps only the bucket’s owned leaves', () => {
  const themeFrag = extractBucket(brandA, 'theme')
  assert.equal(themeFrag.theme.cssVars['color-primary'], 'blue')
  assert.equal(themeFrag.metadata, undefined) // theme owns no metadata leaves (metadata is identity)

  const identityFrag = extractBucket(brandA, 'identity')
  assert.equal(identityFrag.metadata.applicationName, 'A-app')
  assert.equal(identityFrag.theme, undefined) // theme leaves not in identity fragment
})

test('splitConfig then composeConfig round-trips to the original (extract is the inverse)', () => {
  assert.deepEqual(composeConfig(splitConfig(brandA)), brandA)
})

test('compose from sparse instance fragments — cross-brand, like an archive library', () => {
  // Simulate: theme instance from archive B, identity+logos+… from archive A (sparse fragments).
  const composed = composeConfig({
    theme: extractBucket(brandB, 'theme'),
    identity: extractBucket(brandA, 'identity'),
    behavior: extractBucket(brandA, 'behavior'),
  })
  assert.equal(composed.theme.cssVars['color-primary'], 'green') // B
  assert.equal(composed.metadata.applicationName, 'A-app') // A (identity fragment)
  assert.equal(composed.group.nameLengthMax, 40) // A (behavior fragment)
  assert.equal(composed.category.max, brandingDefaults.category.max) // unfilled leaf → default
})
