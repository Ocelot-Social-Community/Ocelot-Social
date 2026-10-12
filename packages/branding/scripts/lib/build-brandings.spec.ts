// The brand-build library (scripts/lib/build-brandings.ts): id/version resolution and the archive
// bundler that turns a brand directory into a partial `<id>.tar.gz` (only customised buckets emit a
// fragment) with asset paths namespaced under /branding/<id>/. Runs against real temp brand dirs and a
// `.mjs` config (no TypeScript compiler needed).
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'

import { composeArchive, readManifest } from '../../dist/discover.js'
import { readTarGz } from '../../dist/tar.js'

import {
  brandId,
  brandVersion,
  buildBrandArchive,
  findConfig,
  outSpecifyRoot,
  publishBrandArchive,
} from './build-brandings.ts'

const roots = []
after(() => {
  for (const dir of roots) {
    rmSync(dir, { recursive: true, force: true })
  }
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
  if (pkg) {
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  }
  if (config) {
    writeFileSync(join(dir, 'brand.config.mjs'), config)
  }
  // Arbitrary nested files (e.g. emails/, public/) written verbatim under the brand dir.
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body)
  }
  const assetDir = join(dir, 'assets')
  mkdirSync(assetDir, { recursive: true })
  for (const [name, body] of Object.entries(assets)) {
    writeFileSync(join(assetDir, name), body)
  }
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

/** A minimal but genuine PNG header — enough for the checks, which read only the IHDR chunk. */
function pngBytes(width, height) {
  const data = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data)
  data.write('IHDR', 12, 'ascii')
  data.writeUInt32BE(width, 16)
  data.writeUInt32BE(height, 20)
  return data
}

const ACME_CONFIG = `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Acme' },
    
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
  await assert.rejects(async () => buildBrandArchive(brandDir({})), /no brand\.config/)
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

test('buildBrandArchive packs the raw emails/ and assets/ trees into the archive', async () => {
  const built = await buildBrandArchive(
    brandDir({
      config: ACME_CONFIG,
      files: {
        'emails/templates/registration/html.pug': 'p brand registration',
        'emails/locales/en.json': '{"greeting":"hi"}',
        'assets/badges/trophy_bear.svg': '<svg>brand</svg>',
      },
    }),
  )
  const archive = readTarGz(built.gz)
  // emails/ is overlaid onto the backend's disk at bootstrap (email-templates reads files);
  // assets/ is served straight from the archive at /branding/<id>/assets/… — badges included.
  assert.equal(
    archive.get('emails/templates/registration/html.pug').toString(),
    'p brand registration',
  )
  assert.equal(archive.get('emails/locales/en.json').toString(), '{"greeting":"hi"}')
  assert.equal(archive.get('assets/badges/trophy_bear.svg').toString(), '<svg>brand</svg>')
})

test('buildBrandArchive drops a legacy public/ tree and warns about it', async () => {
  const built = await buildBrandArchive(
    brandDir({
      config: ACME_CONFIG,
      files: { 'public/img/badges/association_apt.svg': '<svg>legacy</svg>' },
    }),
  )
  // Not packed at all: the bucket that used to be copied onto the backend's disk is gone, so a brand
  // left behind on the old layout must FAIL LOUDLY rather than ship icons nothing can serve.
  assert.equal(readTarGz(built.gz).has('public/img/badges/association_apt.svg'), false)
  assert.ok(built.warnings.some((w) => w.includes('public/ is NO LONGER PACKED')))
})

test('buildBrandArchive emits a PARTIAL library: only customised buckets get a fragment', async () => {
  const built = await buildBrandArchive(
    brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } }),
  )
  const types = readManifest(readTarGz(built.gz))
    .instances.map((i) => i.type)
    .sort()
  // identity (applicationName + derived ogImage) and logos (signupPath) customised; legal /
  // navigation / behavior untouched → NOT emitted. NOR theme: it is derived from the brand's
  // stylesheets, and this fixture ships none (the stylesheet path is covered further down).
  assert.deepEqual(types, ['identity', 'logos'])
})

test('buildBrandArchive namespaces asset paths', async () => {
  const built = await buildBrandArchive(
    brandDir({ config: ACME_CONFIG, assets: { 'logo-squared.svg': '<svg/>' } }),
  )
  const files = readTarGz(built.gz)
  const config = composeArchive(files)
  assert.equal(config.logos.signupPath, '/branding/acme/assets/logo-squared.svg')
  // the referenced asset is bundled into the archive
  assert.ok(files.has('assets/logo-squared.svg'))
  // The two warnings this fixture draws are about the icon slot it leaves empty and the SVG logo that
  // cannot stand in as OG image — both pinned in their own blocks below, and orthogonal to the
  // namespacing this test is about.
  assert.deepEqual(
    built.warnings.filter((w) => !w.includes('assets.icon') && !w.includes('ogImage')),
    [],
  )
})

test('buildBrandArchive warns when a referenced asset is missing (but still builds)', async () => {
  const built = await buildBrandArchive(brandDir({ config: ACME_CONFIG })) // no asset file written
  assert.equal(built.warnings.length > 0, true)
  assert.match(built.warnings.join('\n'), /logo-squared\.svg/)
})

test('buildBrandArchive namespaces css, favicon, icon and html-per-locale paths', async () => {
  const dir = brandDir({
    config: `export default (defineBranding) =>
      defineBranding({
        metadata: { applicationName: 'Rich' },
        assets: {
          css: ['assets/extra.css'],
          favicon: 'assets/favicon.ico',
          icon: 'assets/icon.png',
          html: { imprint: { en: 'html/imprint.en.html' } },
        },
        headerMenu: { customButton: { iconPath: 'assets/button.svg', url: 'https://example.test' } },
      })
`,
    assets: { 'extra.css': 'x', 'favicon.ico': 'x', 'icon.png': 'x', 'button.svg': 'x' },
  })
  // the html/ referenced file lives outside assets/ — create it so no warning is emitted
  mkdirSync(join(dir, 'html'), { recursive: true })
  writeFileSync(join(dir, 'html/imprint.en.html'), '<p/>')

  const config = composeArchive(readTarGz((await buildBrandArchive(dir)).gz))
  assert.deepEqual(config.assets.css, ['/branding/acme/assets/extra.css'])
  assert.equal(config.assets.favicon, '/branding/acme/assets/favicon.ico')
  // The apple-touch / PWA icon travels the same way — a favicon cannot stand in for it (.ico is not
  // an apple-touch-icon format), so it is a slot of its own rather than a derived path.
  assert.equal(config.assets.icon, '/branding/acme/assets/icon.png')
  assert.equal(config.assets.html.imprint.en, '/branding/acme/html/imprint.en.html')
  // the framework's /img/custom/.
  assert.equal(config.headerMenu.customButton.iconPath, '/branding/acme/assets/button.svg')
})

// A brand's theme reaches its e-mails through ONE generated file, overlaid onto the framework's empty
// placeholder at backend bootstrap. Nothing else connects assets.css to a mail.
describe('the e-mail stylesheet', () => {
  const EMAIL_CSS = 'emails/templates/includes/branding.css'

  const themed = (css: string, files = {}) =>
    brandDir({
      config: `export default (d) => d({
        metadata: { applicationName: 'Acme' },
        assets: { css: ['assets/theme.css'] },
      })
`,
      assets: { 'theme.css': css },
      files,
    })

  test('is generated from the tokens the brand overrides', async () => {
    const dir = themed(':root { --color-primary: rgb(239, 124, 0); }')

    const css = readTarGz((await buildBrandArchive(dir)).gz)
      .get(EMAIL_CSS)
      .toString()

    // Literals, never var(): no mail client resolves custom properties (see lib/emailTheme.ts).
    assert.equal(css.includes('var('), false)
    assert.match(css, /a \{\n {2}color: rgb\(239, 124, 0\);\n\}/)
    assert.match(css, /background: rgb\(239, 124, 0\);/)
  })

  // Otherwise every archive would carry a stylesheet restating the framework's own values, and a
  // later change to the framework's mail styling would be silently overridden by all of them.
  test('is omitted for a brand that overrides nothing a mail renders', async () => {
    const dir = themed(':root { --color-neutral-50: pink; }')

    assert.equal(readTarGz((await buildBrandArchive(dir)).gz).has(EMAIL_CSS), false)
  })

  // A hand-written file is a deliberate choice and has to win over anything derived.
  test('never overwrites one the brand wrote itself', async () => {
    const dir = themed(':root { --color-primary: rgb(239, 124, 0); }', {
      [EMAIL_CSS]: 'a { color: hotpink; }',
    })

    const css = readTarGz((await buildBrandArchive(dir)).gz)
      .get(EMAIL_CSS)
      .toString()

    assert.equal(css, 'a { color: hotpink; }')
  })
})

test('buildBrandArchive warns on a SOURCE stylesheet in assets/ (packed but never compiled)', async () => {
  const dir = brandDir({
    config: `export default (d) => d({
      metadata: { applicationName: 'Acme' },
      assets: { css: ['assets/branding.css'] },
    })\n`,
    assets: { 'branding.css': 'a { color: red }' },
  })
  // the legacy build-time overlay a migrated brand still carries
  mkdirSync(join(dir, 'assets/styles/imports'), { recursive: true })
  writeFileSync(join(dir, 'assets/styles/imports/_branding.scss'), '$c: red;')

  const built = await buildBrandArchive(dir)
  const w = built.warnings.join('\n')
  assert.match(w, /assets\/styles\/imports\/_branding\.scss is a SOURCE stylesheet/)
  assert.doesNotMatch(w, /branding\.css is a SOURCE/) // plain CSS is fine — it IS served
  // it still builds, and the file is still packed (removing it is the brand's call)
  assert.ok(readTarGz(built.gz).has('assets/styles/imports/_branding.scss'))
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

test('buildBrandArchive warns on a likely theme token typo in the CSS, not on custom vars', async () => {
  const dir = brandDir({
    config: `export default (d) => d({
      metadata: { applicationName: 'Acme' },
      assets: { css: ['assets/theme.css'] },
    })\n`,
    assets: { 'theme.css': ':root { --color-primry: red; --my-brand-var: x }' },
  })
  const w = (await buildBrandArchive(dir)).warnings.join('\n')
  assert.match(w, /--color-primry is not a known theme token — did you mean --color-primary/)
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
    async () =>
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

test('the PWA colour is evaluated from --color-primary in a listed stylesheet', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ metadata: { applicationName: 'Acme' }, assets: { css: ['assets/theme.css'] } })\n`,
    assets: {
      'theme.css':
        ':root {\n  --color-primary: rgb(1, 2, 3);\n  --font-family-text: Inter, sans-serif;\n}\n',
    },
  })

  const built = await buildBrandArchive(dir)
  const files = readTarGz(built.gz)
  const theme = JSON.parse(files.get('fragments/theme.default.json'))
  assert.equal(theme.theme.tokens['color-primary'], 'rgb(1, 2, 3)')
  // Every token the brand declares travels, not just the PWA colour — and the declarations themselves
  // stay in the stylesheet, which is what the webapp actually renders from.
  assert.equal(theme.theme.tokens['font-family-text'], 'Inter, sans-serif')
  assert.match(String(files.get('assets/theme.css')), /--font-family-text: Inter, sans-serif/)
  // Framework tokens the brand did NOT touch stay out: storing them would freeze the framework's
  // palette into this archive, to go stale the next time a default moves.
  assert.equal('color-danger' in theme.theme.tokens, false)
  assert.equal(built.warnings.join('\n').includes('theme.css'), false)
})

// A manifest has no media queries: whatever travels in theme.tokens is applied unconditionally, so it
// has to be the value that holds unconditionally.
test('a dark-mode override does not become the PWA colour', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ assets: { css: ['assets/theme.css'] } })\n`,
    assets: {
      'theme.css':
        ':root { --color-primary: rgb(1, 2, 3) }\n' +
        '@media (prefers-color-scheme: dark) { :root { --color-primary: black } }\n',
    },
  })

  const built = await buildBrandArchive(dir)
  const theme = JSON.parse(readTarGz(built.gz).get('fragments/theme.default.json'))
  assert.equal(theme.theme.tokens['color-primary'], 'rgb(1, 2, 3)')
})

test('a --color-primary that only holds inside an at-rule is reported', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ assets: { css: ['assets/theme.css'] } })\n`,
    assets: {
      'theme.css': '@media (prefers-color-scheme: dark) { :root { --color-primary: black } }\n',
    },
  })

  const built = await buildBrandArchive(dir)
  assert.match(built.warnings.join('\n'), /--color-primary is only declared inside an at-rule/)
})

test('an unparseable stylesheet is reported instead of failing the build', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ assets: { css: ['assets/theme.css'] } })\n`,
    assets: { 'theme.css': ':root { --color-primary: red' },
  })

  const built = await buildBrandArchive(dir)
  assert.match(built.warnings.join('\n'), /'assets\/theme\.css' is not parseable CSS/)
})

test('the packed stylesheet ships with :root raised to :root:root', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ assets: { css: ['assets/theme.css'] } })\n`,
    assets: { 'theme.css': ':root { --color-primary: new }\n.footer { color: red }' },
  })

  const built = await buildBrandArchive(dir)
  const packed = String(readTarGz(built.gz).get('assets/theme.css'))
  // Specificity, not load order: with build.extractCSS false the app CSS lands after anything the
  // server put in <head>, so a plain :root would lose.
  assert.match(packed, /:root:root \{ --color-primary: new \}/)
  assert.match(packed, /\.footer \{ color: red \}/)
})

test('raising :root leaves selectors it does not own alone', () => {
  assert.equal(outSpecifyRoot('.a, :root { --a: 1 }'), '.a, :root:root { --a: 1 }')
  assert.equal(
    outSpecifyRoot('@media (min-width: 600px) { :root { --a: 1 } }'),
    '@media (min-width: 600px) { :root:root { --a: 1 } }',
  )
  assert.equal(outSpecifyRoot(':root:root { --a: 1 }'), ':root:root { --a: 1 }')
})

// A `}` inside a value or a comment reads like the end of a rule to a regex, which used to rewrite
// straight into the string.
test('raising :root does not reach into strings or comments', () => {
  assert.equal(outSpecifyRoot('.x { content: "}:root {" }'), '.x { content: "}:root {" }')
  assert.equal(
    outSpecifyRoot('/* }:root { */ .y { color: red }'),
    '/* }:root { */ .y { color: red }',
  )
})

test('an unparseable stylesheet ships unchanged rather than failing the pack', () => {
  const broken = ':root { --a: 1px'
  assert.equal(outSpecifyRoot(broken), broken)
})

test('a stylesheet listed in assets.css that does not exist is reported', async () => {
  const dir = brandDir({
    config: `export default (d) => d({ assets: { css: ['missing.css'] } })\n`,
  })

  const built = await buildBrandArchive(dir)
  assert.match(built.warnings.join('\n'), /assets\.css lists 'missing\.css', which does not exist/)
})

// assets.icon is consumed as a fixed-size square bitmap by the PWA manifest and the iOS home screen,
// and NEITHER reports back: a wrong file surfaces as a stretched, blurred or absent icon on someone
// else's phone. The build is the last place it is cheap to notice. (See lib/imageSize.spec.ts for the
// header reading itself; what these pin is which files draw which warning.)
describe('assets.icon', () => {
  const withIcon = (body, name = 'icon.png') =>
    brandDir({
      config: `export default (d) => d({ assets: { icon: 'assets/${name}' } })\n`,
      assets: { [name]: body },
    })

  const iconWarnings = async (dir) =>
    (await buildBrandArchive(dir)).warnings.filter((w) => w.includes('assets.icon')).join('\n')

  test('a square icon at the declared size passes without comment', async () => {
    assert.equal(await iconWarnings(withIcon(pngBytes(512, 512))), '')
    // Larger is fine too — the manifest declares 192 and 512, and browsers downscale.
    assert.equal(await iconWarnings(withIcon(pngBytes(1024, 1024))), '')
  })

  // The trap the extension-derived MIME type sets: nothing downstream inspects the file, so the
  // manifest announces `image/svg+xml` and a browser that will not rasterise it drops the icon.
  test('warns that an svg is not a raster image', async () => {
    const warning = await iconWarnings(withIcon('<svg viewBox="0 0 512 512"></svg>', 'icon.svg'))

    assert.match(warning, /is SVG, not a raster image/)
  })

  // .ico is the FAVICON format, and the two slots exist separately precisely because iOS ignores it.
  test('warns that an ico is not a raster image', async () => {
    const warning = await iconWarnings(
      withIcon(Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]), 'icon.ico'),
    )

    assert.match(warning, /is ICO, not a raster image/)
  })

  test('warns about a non-square icon, naming both dimensions', async () => {
    const warning = await iconWarnings(withIcon(pngBytes(512, 300)))

    assert.match(warning, /is 512×300, not square/)
  })

  test('warns about an icon smaller than browsers install at', async () => {
    const warning = await iconWarnings(withIcon(pngBytes(192, 192)))

    assert.match(warning, /is 192px — browsers pick an install icon at up to 512px/)
  })

  test('warns about a file that is not an image at all', async () => {
    const warning = await iconWarnings(withIcon('not an image'))

    assert.match(warning, /is not an image format this build recognises/)
  })

  // Reported apart from "not an image": the file IS a PNG, it just got cut off — which points at the
  // brand's own packaging (a truncated copy, a bad LFS checkout) rather than at the wrong file.
  test('warns about a truncated image separately from an unrecognised one', async () => {
    const warning = await iconWarnings(withIcon(pngBytes(512, 512).subarray(0, 12)))

    assert.match(warning, /is a truncated PNG file/)
  })

  // A brand may point at an icon it hosts itself, or name one that is not there. Neither is this
  // check's business — and a missing file is already reported by the namespacing pass, so saying it
  // twice is noise.
  test('says nothing when there is no local file to inspect', async () => {
    assert.equal(
      await iconWarnings(
        brandDir({
          config: `export default (d) => d({ assets: { icon: 'https://cdn.example/icon.png' } })\n`,
        }),
      ),
      '',
    )
    const missing = brandDir({
      config: `export default (d) => d({ assets: { icon: 'assets/nowhere.png' } })\n`,
    })
    assert.equal(await iconWarnings(missing), '')
    assert.match((await buildBrandArchive(missing)).warnings.join('\n'), /asset not found/)
  })

  // existsSync only says the path resolves. A DIRECTORY passes it and then throws EISDIR on read — and
  // an exception here would abort the whole archive over an optional slot, which is exactly what every
  // other verdict in this check is written to avoid.
  test('warns instead of throwing when the path cannot be read as a file', async () => {
    const dir = brandDir({
      config: `export default (d) => d({ assets: { icon: 'assets' } })\n`,
    })

    const warning = await iconWarnings(dir)

    assert.match(warning, /assets\.icon 'assets' cannot be read — EISDIR/)
  })

  // The case that used to pass in silence, and the reason every brand shipped an unread
  // assets/icon.png: with the slot empty, the apple-touch-icon and the PWA install icon both resolve
  // to the framework's own file, so a fully branded instance installs under the vanilla ocelot.
  test('warns when the slot is empty altogether', async () => {
    const warning = await iconWarnings(brandDir({ config: ACME_CONFIG }))

    assert.match(warning, /no assets\.icon —/)
    assert.match(warning, /installs under the vanilla icon/)
  })

  // What the manifest DECLARES has to be what the file IS: a browser that checks the decoded size
  // against `sizes` drops a candidate that contradicts it, and the manifest has no other source for
  // the number (webapp/server-middleware/manifest.js reads exactly this field).
  describe('iconSizes', () => {
    const iconSizes = async (dir) =>
      composeArchive(readTarGz((await buildBrandArchive(dir)).gz)).assets.iconSizes

    test('carries the measured pixel size of the icon', async () => {
      assert.equal(await iconSizes(withIcon(pngBytes(512, 512))), '512x512')
      // Measured even when the size draws a warning — 225px is what every ocelot brand actually
      // ships, and reporting it truthfully is what lets the browser scale it itself.
      assert.equal(await iconSizes(withIcon(pngBytes(225, 225))), '225x225')
      // A non-square icon is warned about, not silently squared off.
      assert.equal(await iconSizes(withIcon(pngBytes(512, 300))), '512x300')
    })

    test('stays null when the file cannot be measured', async () => {
      assert.equal(await iconSizes(brandDir({ config: ACME_CONFIG })), null) // no icon at all
      assert.equal(await iconSizes(withIcon('<svg viewBox="0 0 512 512"></svg>', 'icon.svg')), null)
      assert.equal(await iconSizes(withIcon(pngBytes(512, 512).subarray(0, 12))), null) // truncated
      assert.equal(
        await iconSizes(
          brandDir({
            config: `export default (d) => d({ assets: { icon: 'https://cdn.example/icon.png' } })\n`,
          }),
        ),
        null, // hosted elsewhere — not ours to read
      )
    })

    // Authored values are overwritten, not merged: the field describes the file this build read, and a
    // stale hand-written number is exactly the drift it exists to remove.
    test('overrides whatever the brand wrote', async () => {
      const dir = brandDir({
        config: `export default (d) => d({ assets: { icon: 'assets/icon.png', iconSizes: '512x512' } })\n`,
        assets: { 'icon.png': pngBytes(225, 225) },
      })

      assert.equal(await iconSizes(dir), '225x225')
    })
  })
})

// metadata.ogImage is what a shared link shows in Discord, Facebook, X and the messengers — none of
// which render SVG, and all of which take the announced size and type at their word. Like the icon, a
// wrong file only shows up on somebody else's screen.
describe('metadata.ogImage', () => {
  const metadataOf = async (dir) =>
    composeArchive(readTarGz((await buildBrandArchive(dir)).gz)).metadata
  const ogWarnings = async (dir) =>
    (await buildBrandArchive(dir)).warnings.filter((w) => w.includes('ogImage')).join('\n')

  const withLogo = (body, name) =>
    brandDir({
      config: `export default (d) => d({ metadata: { applicationName: 'Acme' }, logos: { signupPath: 'assets/${name}' } })\n`,
      assets: { [name]: body },
    })

  const withOgImage = (body, name, extra = '') =>
    brandDir({
      config: `export default (d) => d({ metadata: { ogImage: 'assets/${name}'${extra} } })\n`,
      assets: { [name]: body },
    })

  describe('without an own ogImage', () => {
    test('follows a raster squared logo and announces its measured size and type', async () => {
      const metadata = await metadataOf(withLogo(pngBytes(600, 600), 'logo-squared.png'))

      assert.equal(metadata.ogImage, '/branding/acme/assets/logo-squared.png')
      assert.equal(metadata.ogImageWidth, '600')
      assert.equal(metadata.ogImageHeight, '600')
      assert.equal(metadata.ogImageType, 'image/png')
      // The vanilla alt text names the ocelot logo; the brand's logo is the brand's.
      assert.equal(metadata.ogImageAlt, 'Acme Logo')
    })

    // The stage brand's case: its squared logo is an SVG, the previews showed nothing at all.
    test('keeps the vanilla image when the squared logo is an SVG, and says so', async () => {
      const dir = withLogo('<svg viewBox="0 0 10 10"></svg>', 'logo-squared.svg')
      const metadata = await metadataOf(dir)

      assert.equal(metadata.ogImage, '/img/custom/logo-squared.png')
      assert.equal(metadata.ogImageType, 'image/png')
      assert.equal(metadata.ogImageAlt, 'ocelot.social Logo') // still the vanilla picture
      assert.match(
        await ogWarnings(dir),
        /no metadata\.ogImage, and the squared logo 'assets\/logo-squared\.svg' is SVG, which link previews do not render/,
      )
    })

    test('keeps the vanilla image when the squared logo is truncated or unrecognised', async () => {
      const truncated = withLogo(pngBytes(600, 600).subarray(0, 12), 'logo-squared.png')
      const unknown = withLogo('plain text', 'logo-squared.png')

      assert.equal((await metadataOf(truncated)).ogImage, '/img/custom/logo-squared.png')
      assert.match(await ogWarnings(truncated), /is a truncated PNG file/)
      assert.equal((await metadataOf(unknown)).ogImage, '/img/custom/logo-squared.png')
      assert.match(await ogWarnings(unknown), /is not an image format this build recognises/)
    })

    // Hosted elsewhere, so only the name can tell: an .svg one stays out, anything else is followed.
    test('judges a logo it cannot read by its extension', async () => {
      const external = (url) =>
        brandDir({ config: `export default (d) => d({ logos: { signupPath: '${url}' } })\n` })

      const followed = await metadataOf(external('https://cdn.example/logo.png'))
      assert.equal(followed.ogImage, 'https://cdn.example/logo.png')
      // Unmeasured, so unannounced: the vanilla 1200×1140 PNG says nothing about this file.
      assert.equal(followed.ogImageWidth, '')
      assert.equal(followed.ogImageHeight, '')
      assert.equal(followed.ogImageType, '')
      assert.equal(followed.ogImageAlt, 'ocelot.social Logo') // applicationName left at the default
      assert.equal(
        (await metadataOf(external('https://cdn.example/logo.svg?v=2'))).ogImage,
        '/img/custom/logo-squared.png',
      )
    })

    test('leaves the vanilla image alone when the brand keeps the vanilla logo', async () => {
      const dir = brandDir({
        config: `export default (d) => d({ metadata: { applicationName: 'X' } })\n`,
      })

      assert.equal((await metadataOf(dir)).ogImage, '/img/custom/logo-squared.png')
      assert.equal(await ogWarnings(dir), '')
    })
  })

  describe('with an own ogImage', () => {
    // The defaults describe the vanilla 1200×1140 PNG; next to a brand's file they would be wrong.
    test('announces the measured size and type, over whatever the brand wrote', async () => {
      const dir = withOgImage(
        pngBytes(1200, 630),
        'og.png',
        `, ogImageWidth: '1', ogImageHeight: '1', ogImageType: 'image/gif'`,
      )
      const metadata = await metadataOf(dir)

      assert.equal(metadata.ogImage, '/branding/acme/assets/og.png')
      assert.equal(metadata.ogImageWidth, '1200')
      assert.equal(metadata.ogImageHeight, '630')
      assert.equal(metadata.ogImageType, 'image/png')
      // Only the brand can describe its own picture; the vanilla text describes the ocelot logo.
      assert.equal(metadata.ogImageAlt, '')
      assert.equal(await ogWarnings(dir), '')
    })

    test('warns about a truncated file', async () => {
      const dir = withOgImage(pngBytes(1200, 630).subarray(0, 12), 'og.png')

      assert.match(
        await ogWarnings(dir),
        /metadata\.ogImage 'assets\/og\.png' is a truncated PNG file/,
      )
    })

    test("warns about an SVG but keeps it — the choice is the brand's", async () => {
      const dir = withOgImage('<svg viewBox="0 0 10 10"></svg>', 'og.svg')

      assert.equal((await metadataOf(dir)).ogImage, '/branding/acme/assets/og.svg')
      assert.match(
        await ogWarnings(dir),
        /metadata\.ogImage 'assets\/og\.svg' is SVG, which link previews do not render — ship a PNG or JPEG/,
      )
    })

    test('keeps what the brand set for a file it cannot read, and drops what it inherited', async () => {
      const external = brandDir({
        config: `export default (d) => d({ metadata: { ogImage: 'https://cdn.example/og.png', ogImageWidth: '800', ogImageAlt: 'Our banner' } })\n`,
      })
      const missing = brandDir({
        config: `export default (d) => d({ metadata: { ogImage: 'assets/og.png' } })\n`,
      })

      const fromCdn = await metadataOf(external)
      assert.equal(fromCdn.ogImage, 'https://cdn.example/og.png')
      assert.equal(fromCdn.ogImageWidth, '800')
      assert.equal(fromCdn.ogImageAlt, 'Our banner')
      assert.equal(fromCdn.ogImageHeight, '')
      assert.equal(fromCdn.ogImageType, '')
      assert.equal((await metadataOf(missing)).ogImageWidth, '')
      assert.equal(await ogWarnings(missing), '') // reported once, as "referenced asset not found"
    })
  })
})
