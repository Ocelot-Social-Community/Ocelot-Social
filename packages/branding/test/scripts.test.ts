// The brand-build library (scripts/lib/build-brandings.ts): id/version resolution and the archive
// bundler that turns a brand directory into a partial `<id>.tar.gz` (only customised buckets emit a
// fragment) with asset paths namespaced under /branding/<id>/. Runs against real temp brand dirs and a
// `.mjs` config (no TypeScript compiler needed).
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'

import { composeArchive, readManifest } from '../dist/discover.js'
import { readTarGz } from '../dist/tar.js'
import {
  brandId,
  brandVersion,
  buildBrandArchive,
  findConfig,
  publishBrandArchive,
} from '../scripts/lib/build-brandings.ts'

const roots = []
after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

// Create a temp brand dir: package.json (unless pkg===null), a .mjs config with the given overrides,
// an assets/ dir holding every file in `assets`, and a locales/ dir with a <code>.json per `locales`.
function brandDir({
  pkg = { name: 'acme-branding', version: '1.2.3' },
  config,
  assets = {},
  locales = {},
  files = {},
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-brand-'))
  roots.push(dir)
  if (pkg) writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  if (config) writeFileSync(join(dir, 'brand.config.mjs'), config)
  // Arbitrary nested files (e.g. emails/, public/) written verbatim under the brand dir.
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body)
  }
  const assetDir = join(dir, 'assets')
  mkdirSync(assetDir, { recursive: true })
  for (const [name, body] of Object.entries(assets)) writeFileSync(join(assetDir, name), body)
  if (Object.keys(locales).length) {
    const localesDir = join(dir, 'locales')
    mkdirSync(localesDir, { recursive: true })
    for (const [code, body] of Object.entries(locales)) {
      writeFileSync(
        join(localesDir, `${code}.json`),
        typeof body === 'string' ? body : JSON.stringify(body),
      )
    }
  }
  return dir
}

const ACME_CONFIG = `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Acme' },
    theme: { cssVars: { 'color-primary': 'red' } },
    logos: { signupPath: 'assets/logo-squared.svg' },
  })
`

test('brandId: pkg.brandId wins, else name minus -branding suffix, else the directory basename', () => {
  assert.equal(brandId(brandDir({ pkg: { brandId: 'explicit', name: 'whatever' } })), 'explicit')
  assert.equal(brandId(brandDir({ pkg: { name: 'yunite-branding' } })), 'yunite')
  assert.equal(brandId(brandDir({ pkg: null })).length > 0, true) // basename fallback (temp dir name)
})

test('brandVersion: package.json version verbatim — including 0.0.0 (NOT hidden), null when unset', () => {
  assert.equal(brandVersion(brandDir({ pkg: { name: 'x', version: '2.5.0' } })), '2.5.0')
  assert.equal(brandVersion(brandDir({ pkg: { name: 'x', version: '0.0.0' } })), '0.0.0')
  assert.equal(brandVersion(brandDir({ pkg: { name: 'x' } })), null)
  assert.equal(brandVersion(brandDir({ pkg: null })), null)
})

test('findConfig locates brand.config.mjs, or null when there is none', () => {
  assert.match(findConfig(brandDir({ config: ACME_CONFIG })), /brand\.config\.mjs$/)
  assert.equal(findConfig(brandDir({})), null)
})

test('buildBrandArchive throws when the brand has no config file', async () => {
  await assert.rejects(() => buildBrandArchive(brandDir({})), /no brand\.config/)
})

test('buildBrandArchive: manifest carries id/version/schemaVersion/label', async () => {
  const built = await buildBrandArchive(
    brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } }),
  )
  assert.equal(built.id, 'acme')
  assert.equal(built.version, '1.2.3')
  assert.equal(built.label, 'Acme')
  const manifest = readManifest(readTarGz(built.gz))
  assert.equal(manifest.id, 'acme')
  assert.equal(manifest.version, '1.2.3')
  assert.equal(manifest.label, 'Acme')
  // schemaVersion = THIS @ocelot-social/branding package version (baked from its package.json).
  assert.equal(typeof manifest.schemaVersion, 'string')
})

test('buildBrandArchive packs the raw emails/ and public/ trees into the archive', async () => {
  const built = await buildBrandArchive(
    brandDir({
      config: ACME_CONFIG,
      files: {
        'emails/templates/registration/html.pug': 'p brand registration',
        'emails/locales/en.json': '{"greeting":"hi"}',
        'public/img/badges/default_trophy.svg': '<svg>brand</svg>',
      },
    }),
  )
  const archive = readTarGz(built.gz)
  // Consumed at backend bootstrap by overlayBrandRuntimeFiles (e-mail templates/locales + public badges).
  assert.equal(
    archive.get('emails/templates/registration/html.pug').toString(),
    'p brand registration',
  )
  assert.equal(archive.get('emails/locales/en.json').toString(), '{"greeting":"hi"}')
  assert.equal(archive.get('public/img/badges/default_trophy.svg').toString(), '<svg>brand</svg>')
})

test('buildBrandArchive emits a PARTIAL library: only customised buckets get a fragment', async () => {
  const built = await buildBrandArchive(
    brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } }),
  )
  const types = readManifest(readTarGz(built.gz))
    .instances.map((i) => i.type)
    .sort()
  // theme (cssVars), identity (applicationName + derived ogImage), logos (signupPath) customised;
  // legal / navigation / behavior untouched → NOT emitted.
  assert.deepEqual(types, ['identity', 'logos', 'theme'])
})

test('buildBrandArchive namespaces asset paths and derives ogImage from the squared logo', async () => {
  const built = await buildBrandArchive(
    brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } }),
  )
  const files = readTarGz(built.gz)
  const config = composeArchive(files)
  assert.equal(config.logos.signupPath, '/branding/acme/assets/logo-squared.svg')
  // ogImage was left at the default → follows the brand's squared logo (namespaced).
  assert.equal(config.metadata.ogImage, '/branding/acme/assets/logo-squared.svg')
  // the referenced asset is bundled into the archive
  assert.ok(files.has('assets/logo-squared.svg'))
  assert.equal(built.warnings.length, 0)
})

test('buildBrandArchive warns when a referenced asset is missing (but still builds)', async () => {
  const built = await buildBrandArchive(brandDir({ config: ACME_CONFIG })) // no asset file written
  assert.equal(built.warnings.length > 0, true)
  assert.match(built.warnings.join('\n'), /logo-squared\.svg/)
})

test('buildBrandArchive namespaces css, favicon, html-per-locale and font-face src paths', async () => {
  const dir = brandDir({
    config: `export default (defineBranding) =>
      defineBranding({
        metadata: { applicationName: 'Rich' },
        assets: {
          css: ['assets/extra.css'],
          favicon: 'assets/favicon.ico',
          html: { imprint: { en: 'html/imprint.en.html' } },
        },
        theme: { fontFaces: [{ family: 'Brand', src: 'assets/brand.woff2' }] },
      })
`,
    assets: { 'extra.css': 'x', 'favicon.ico': 'x', 'brand.woff2': 'x' },
  })
  // the html/ referenced file lives outside assets/ — create it so no warning is emitted
  mkdirSync(join(dir, 'html'), { recursive: true })
  writeFileSync(join(dir, 'html/imprint.en.html'), '<p/>')

  const config = composeArchive(readTarGz((await buildBrandArchive(dir)).gz))
  assert.deepEqual(config.assets.css, ['/branding/acme/assets/extra.css'])
  assert.equal(config.assets.favicon, '/branding/acme/assets/favicon.ico')
  assert.equal(config.assets.html.imprint.en, '/branding/acme/html/imprint.en.html')
  assert.equal(config.theme.fontFaces[0].src, '/branding/acme/assets/brand.woff2')
})

test('brandId / brandVersion degrade gracefully on a malformed package.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-badpkg-'))
  roots.push(dir)
  writeFileSync(join(dir, 'package.json'), '{ not: valid json')
  assert.equal(brandVersion(dir), null) // unparseable → no version
  assert.equal(typeof brandId(dir), 'string') // → basename fallback, never throws
})

test('buildBrandArchive reads locales/<code>.json files into config.locales', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ metadata: { applicationName: 'Acme' } })\n`,
    locales: { en: { greeting: { hello: 'Hi' } }, de: { greeting: { hello: 'Hallo' } } },
  })
  const config = composeArchive(readTarGz((await buildBrandArchive(dir)).gz))
  assert.equal(config.locales.en.greeting.hello, 'Hi')
  assert.equal(config.locales.de.greeting.hello, 'Hallo')
})

test('locales/<code>.json deep-merges with inline config.locales — the FILE wins per leaf', async () => {
  const dir = brandDir({
    config: `export default (d) => d({
      metadata: { applicationName: 'Acme' },
      locales: { en: { a: 'inline-a', shared: 'inline' } },
    })\n`,
    locales: { en: { b: 'file-b', shared: 'file' } },
  })
  const config = composeArchive(readTarGz((await buildBrandArchive(dir)).gz))
  assert.equal(config.locales.en.a, 'inline-a') // inline-only key kept
  assert.equal(config.locales.en.b, 'file-b') // file-only key added
  assert.equal(config.locales.en.shared, 'file') // conflict → file wins
})

test('buildBrandArchive warns on an invalid locale JSON (but still builds)', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ metadata: { applicationName: 'Acme' } })\n`,
    locales: { en: '{ not valid json' },
  })
  const built = await buildBrandArchive(dir)
  assert.match(built.warnings.join('\n'), /invalid locale JSON: locales\/en\.json/)
})

test('buildBrandArchive warns on a likely theme.cssVars token typo, not on custom vars', async () => {
  const dir = brandDir({
    config: `export default (d) => d({
      metadata: { applicationName: 'Acme' },
      theme: { cssVars: { 'color-primry': 'red', 'my-brand-var': 'x' } },
    })\n`,
  })
  const w = (await buildBrandArchive(dir)).warnings.join('\n')
  assert.match(w, /theme\.cssVars\['color-primry'\].*did you mean 'color-primary'/) // typo flagged
  assert.doesNotMatch(w, /my-brand-var/) // intentional custom var → no warning
})

test('MODULAR locales/<code>/<feature>.json files merge into the locale; legacy dirs ignored', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ metadata: { applicationName: 'Acme' } })\n`,
    locales: { en: '{ "whole": "file" }' }, // whole-locale file coexists with the per-feature dir
  })
  // per-feature namespace files for 'en' (a feature owns its slice)
  mkdirSync(join(dir, 'locales/en'), { recursive: true })
  writeFileSync(
    join(dir, 'locales/en/registration.json'),
    JSON.stringify({ registration: { title: 'Join' } }),
  )
  writeFileSync(join(dir, 'locales/en/groups.json'), JSON.stringify({ groups: { name: 'Group' } }))
  // a legacy non-locale folder must be ignored (else it would leak into config.locales.tmp)
  mkdirSync(join(dir, 'locales/tmp'), { recursive: true })
  writeFileSync(join(dir, 'locales/tmp/en.json'), JSON.stringify({ leaked: true }))

  const config = composeArchive(readTarGz((await buildBrandArchive(dir)).gz))
  assert.equal(config.locales.en.registration.title, 'Join') // feature file 1
  assert.equal(config.locales.en.groups.name, 'Group') // feature file 2
  assert.equal(config.locales.en.whole, 'file') // whole-locale file merged too
  assert.equal(config.locales.tmp, undefined) // legacy dir ignored, no bogus locale
})

test('publishBrandArchive writes latest + versioned files and a DEFAULT marker', async () => {
  const dir = brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } })
  const out = mkdtempSync(join(tmpdir(), 'ocelot-out-'))
  roots.push(out)
  const res = await publishBrandArchive(dir, { outDir: out, markDefault: true })
  assert.equal(res.latest, join(out, 'acme.tar.gz'))
  assert.equal(res.versioned, join(out, 'acme-1.2.3.tar.gz'))
  assert.ok(existsSync(res.latest))
  assert.ok(existsSync(res.versioned))
  assert.ok(existsSync(join(out, 'DEFAULT')))
})

// A `.ts` brand config is TYPE-CHECKED against the schema before evaluation — the gate that stops a
// brand shipping a mistuned config. Write a brand.config.ts (findConfig prefers .ts) and build it.
function tsBrandDir(configTs) {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-ts-'))
  roots.push(dir)
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'ts-branding', version: '1.0.0' }),
  )
  writeFileSync(join(dir, 'brand.config.ts'), configTs)
  mkdirSync(join(dir, 'assets'), { recursive: true })
  return dir
}

test('buildBrandArchive type-checks and evaluates a valid .ts config', async () => {
  const built = await buildBrandArchive(
    tsBrandDir(
      `import { defineBranding } from '@ocelot-social/branding'
       export default defineBranding({ metadata: { applicationName: 'TsAcme' } })
`,
    ),
  )
  assert.equal(built.label, 'TsAcme')
})

test('buildBrandArchive REJECTS a .ts config with a schema type error', async () => {
  await assert.rejects(
    () =>
      buildBrandArchive(
        tsBrandDir(
          `import { defineBranding } from '@ocelot-social/branding'
           export default defineBranding({ group: { nameLengthMax: 'not-a-number' } })
`,
        ),
      ),
    /failed type-check/,
  )
})

test('publishBrandArchive writes no versioned file when the brand has no version', async () => {
  const dir = brandDir({
    pkg: { name: 'acme-branding' },
    config: ACME_CONFIG,
    assets: { 'logo-squared.svg': '<svg/>' },
  })
  const out = mkdtempSync(join(tmpdir(), 'ocelot-out-'))
  roots.push(out)
  const res = await publishBrandArchive(dir, { outDir: out })
  assert.equal(res.versioned, null)
  assert.ok(existsSync(res.latest))
})
