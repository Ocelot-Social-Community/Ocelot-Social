// The maintenance-page generator (scripts/build-maintenance-branding.ts), run END TO END as the
// Dockerfile and `npm run brand` run it: a real brand dir in, a real maintenance tree written into.
//
// It earns an integration test rather than unit coverage because of what it does to a tree it does
// not own: it recursively REMOVES its five generated paths there and writes them back. That list is
// the entire safety boundary — one wrong entry and it deletes committed sources instead of its own
// output — and the first assertion below is precisely that the committed files come out unchanged.
// Only an end-to-end run exercises the argument handling, the archive round-trip and the file writes
// together.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const GENERATOR = fileURLToPath(new URL('./build-maintenance-branding.ts', import.meta.url))

const roots: string[] = []
after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  roots.push(dir)
  return dir
}

/** Every file under `dir`, as paths relative to it. */
function walk(dir: string, prefix = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...walk(dir, rel))
    else out.push(rel)
  }
  return out.sort()
}

function write(file: string, body: string | Buffer): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}

const readText = (dir: string, rel: string): string => readFileSync(join(dir, rel), 'utf8')
const readJson = (dir: string, rel: string): Record<string, Record<string, string>> =>
  JSON.parse(readText(dir, rel))
/** The generated list of served stylesheet URLs — what nuxt.config turns into <head> links. */
const readSheets = (dir: string): string[] =>
  JSON.parse(readText(dir, 'app/constants/stylesheets.brand.json')) as string[]

/** A brand dir with a squared logo, one web font and a locale carrying maintenance + webapp strings. */
function brandDir(): string {
  const dir = tmp('ocelot-brand-')
  write(join(dir, 'package.json'), JSON.stringify({ name: 'acme-branding', version: '1.0.0' }))
  write(
    join(dir, 'brand.config.mjs'),
    `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Acme' },

    assets: { css: ['assets/brand.css'], favicon: 'assets/favicon.ico' },
    logos: { signupPath: 'assets/logo-squared.svg' },
  })
`,
  )
  write(join(dir, 'assets/logo-squared.svg'), '<svg id="brand"/>')
  write(join(dir, 'assets/favicon.ico'), Buffer.from('ico-bytes'))
  write(join(dir, 'assets/fonts/acme.woff2'), Buffer.from('woff2-bytes'))
  // The font lives in the brand's own stylesheet; url() is relative to THAT file (assets/…).
  write(
    join(dir, 'assets/brand.css'),
    [
      "@font-face { font-family: 'Acme Sans'; src: url('fonts/acme.woff2') format('woff2'); font-weight: 400; }",
      ":root { --color-primary: rebeccapurple; --font-family-text: 'Acme Sans', sans-serif; }",
    ].join('\n'),
  )
  write(
    join(dir, 'locales/de.json'),
    JSON.stringify({
      // A namespace the maintenance page renders …
      maintenance: { explanation: 'Wir sind gleich zurück.' },
      // … and one only the WEBAPP has. It must not be dragged along.
      site: { madeBy: 'Acme' },
    }),
  )
  return dir
}

/**
 * A maintenance tree. The VANILLA locales are the only real input — they decide which codes get an
 * overlay. The rest stands in for the committed sources the generator must not touch, and is chosen
 * deliberately: `app/assets/css/branding.css` and `app/constants/metadata.ts` are exactly the two the
 * generator used to OVERWRITE before the overlays existed, and `public/favicon.ico` sits in the same
 * tree as the served brand files.
 */
function maintenanceDir(): string {
  const dir = tmp('ocelot-maintenance-')
  write(
    join(dir, 'locales/de.json'),
    JSON.stringify({
      maintenance: { explanation: 'Wartungsarbeiten.', title: '{APPLICATION_NAME} …' },
      localeSwitch: { tooltip: 'Sprache' },
    }),
  )
  write(
    join(dir, 'locales/en.json'),
    JSON.stringify({ maintenance: { explanation: 'Back soon.' } }),
  )
  write(join(dir, 'app/assets/css/branding.css'), ':root { --color-primary: green; }\n')
  write(join(dir, 'app/constants/metadata.ts'), 'export default { APPLICATION_NAME: "ocelot" };\n')
  write(join(dir, 'public/favicon.ico'), Buffer.from('icon-bytes'))
  return dir
}

/** Every file under `dir`, path → contents. base64 so a binary asset compares as reliably as text. */
function snapshot(dir: string): Map<string, string> {
  return new Map(walk(dir).map((rel) => [rel, readFileSync(join(dir, rel)).toString('base64')]))
}

/** Whether a path is one the generator declares as its own (see maintenance-generated-paths.json). */
function declaredPaths(): { servedDir: string; paths: string[] } {
  return JSON.parse(
    readFileSync(new URL('./maintenance-generated-paths.json', import.meta.url), 'utf8'),
  ) as { servedDir: string; paths: string[] }
}

function brand(brandPath: string, maintenancePath: string): void {
  execFileSync('node', [GENERATOR, brandPath, maintenancePath], { stdio: 'pipe' })
}

/** Same run, but capturing both streams — the skip warnings are console.warn, i.e. stderr. */
function run(brandPath: string, maintenancePath: string): { status: number; stderr: string } {
  const result = spawnSync('node', [GENERATOR, brandPath, maintenancePath], { encoding: 'utf8' })
  return { status: result.status ?? -1, stderr: result.stderr }
}

describe('build-maintenance-branding', () => {
  // The whole point of the layout: a brand is a set of NEW files. Nothing committed is rewritten, so
  // `git status` after branding is empty and undoing it is a delete — which is also what makes a host
  // mount in docker-compose safe (host and image no longer fight over the same file).
  test('writes only generated files, leaving the committed sources untouched', () => {
    const to = maintenanceDir()
    const before = snapshot(to)

    brand(brandDir(), to)

    // Byte-for-byte, not just "still present": overwriting a committed file in place is precisely the
    // behaviour the overlays replaced. Snapshot ONCE — it walks the whole tree and base64s every file,
    // so taking it per entry would be quadratic I/O over a state that no longer changes anyway.
    const afterRun = snapshot(to)
    for (const [rel, content] of before) {
      assert.equal(afterRun.get(rel), content, `${rel} was modified or removed`)
    }
    for (const rel of [
      'app/constants/stylesheets.brand.json',
      'app/constants/metadata.brand.json',
      'app/locales/de.json',
      'public/brand/logo-squared.svg',
      'public/brand/favicon.ico',
      'public/brand/fonts/acme.woff2',
    ]) {
      assert.ok(existsSync(join(to, rel)), `expected ${rel}`)
    }
  })

  // The list in maintenance-generated-paths.json is what BOTH the generator and `npm run brand:reset`
  // work from. Sharing the file stops the two from drifting apart, but not from being INCOMPLETE — a
  // new output path added to the code and not to the list would still survive every reset. So this
  // walks what was actually written and holds it against the list.
  test('touches nothing outside the paths it declares', () => {
    const to = maintenanceDir()
    const before = snapshot(to)

    brand(brandDir(), to)

    const declared = declaredPaths()
    const managed = (rel: string): boolean =>
      declared.paths.some((p) => rel === p || rel.startsWith(`${p}/`))
    const afterRun = snapshot(to)

    // Added: anything new outside the declared paths would survive every reset and leak into the
    // next brand — the exact failure the shared path list exists to prevent.
    assert.deepEqual(
      [...afterRun.keys()].filter((rel) => !before.has(rel) && !managed(rel)),
      [],
      'written but no reset would remove them',
    )
    // Changed or removed: a path list cannot catch either, so compare the files themselves. Tracking
    // only names would miss a committed file being overwritten in place.
    for (const [rel, content] of before) {
      if (managed(rel)) continue
      assert.ok(afterRun.has(rel), `${rel} was removed`)
      assert.equal(afterRun.get(rel), content, `${rel} was modified`)
    }
    // The served directory travels in the same file; the generator must not invent a second one.
    assert.ok(declared.paths.includes(`public/${declared.servedDir}`))
  })

  test('lists the brand stylesheets by the url they are served from', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    // The brand's own sheet is served from the maintenance app, not from /branding/<id>/… (that route
    // only exists in the live webapp, which is down whenever this page is shown) …
    assert.match(readText(to, 'public/brand/brand.css'), /@font-face/)
    // … and its @font-face url resolves relative to THAT file, which is why the font travels too.
    assert.equal(readText(to, 'public/brand/fonts/acme.woff2'), 'woff2-bytes')
    // A URL, not a filesystem path: nuxt.config links it in the <head> and the browser fetches it
    // from public/. An @import from a BUNDLED stylesheet could not resolve it — vite resolves
    // @import at build time and never looks in publicDir.
    assert.deepEqual(readSheets(to), ['/brand/brand.css'])
    // The tokens live in the linked sheet — nothing generates a :root block any more. And the packed
    // sheet ships with :root:root, so it outranks the maintenance page's own defaults whatever the
    // link order.
    const sheet = readText(to, 'public/brand/brand.css')
    assert.match(sheet, /:root:root \{[^}]*--color-primary: rebeccapurple/)
    assert.match(sheet, /--font-family-text: 'Acme Sans', sans-serif/)
  })

  // Link order is cascade order. The archive is walked with readdirSync (filesystem order), so
  // taking the sheets as they come out of it would let the filesystem decide which of two brand
  // stylesheets wins — here it would invert the brand's choice, since 'a-override' sorts before
  // 'z-base'. Deliberately non-alphabetical config order is the whole point of the fixture.
  test('lists the stylesheets in the order assets.css lists them', () => {
    const dir = tmp('ocelot-brand-order-')
    write(join(dir, 'package.json'), JSON.stringify({ name: 'acme-branding', version: '1.0.0' }))
    write(
      join(dir, 'brand.config.mjs'),
      `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Acme' },
    assets: { css: ['assets/z-base.css', 'assets/a-override.css'] },
  })
`,
    )
    write(join(dir, 'assets/z-base.css'), ':root { --color-primary: from-z-base }')
    write(join(dir, 'assets/a-override.css'), ':root { --color-primary: from-a-override }')

    const to = maintenanceDir()
    brand(dir, to)

    assert.deepEqual(readSheets(to), ['/brand/z-base.css', '/brand/a-override.css'])
    // Both are still unpacked — a sheet's url() has to resolve whatever its place in the cascade.
    assert.ok(existsSync(join(to, 'public/brand/z-base.css')))
    assert.ok(existsSync(join(to, 'public/brand/a-override.css')))
  })

  // The logo travels as a metadata KEY because its filename and extension vary per brand — app.vue
  // reads metadata.LOGO instead of hard-coding a path.
  test('serves the logo from its own directory and names it in the metadata overlay', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
      string,
      string
    >
    assert.equal(readText(to, 'public/brand/logo-squared.svg'), '<svg id="brand"/>')
    assert.equal(meta.LOGO, '/brand/logo-squared.svg')
    assert.equal(meta.APPLICATION_NAME, 'Acme')
    // The one DERIVED value in the overlay: the browser-chrome colour is the brand's primary token,
    // there being no metadata.themeColor field. resolveThemeColor is unit-tested elsewhere; what is
    // only observable here is that its result actually reaches the overlay.
    assert.equal(meta.THEME_COLOR, 'rebeccapurple')
    // The composed ogImage is a /branding/<id>/… path this static site never serves — it has to be
    // rewritten to the copy that IS served, or every link preview 404s.
    assert.equal(meta.OG_IMAGE, '/brand/logo-squared.svg')
  })

  // Without this the page kept its own committed public/favicon.ico — the vanilla ocelot icon — for
  // every brand, permanently: the built index.html carries no icon link (Nuxt 4 adds none, and
  // `ssr: false` keeps useHead out of the prerendered markup), so the browser falls back to its
  // implicit /favicon.ico request and nothing ever pointed it elsewhere.
  test('serves the favicon and names it in the metadata overlay', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
      string,
      string
    >
    assert.equal(readText(to, 'public/brand/favicon.ico'), 'ico-bytes')
    assert.equal(meta.FAVICON, '/brand/favicon.ico')
    // The committed vanilla file is left alone — the overlay redirects the link, it does not
    // overwrite a tracked file (that is the whole point of the overlay design).
    assert.ok(existsSync(join(to, 'public/favicon.ico')))
  })

  // A present overlay key WINS over the vanilla default, so a brand that declares no favicon must
  // yield no key at all — writing null would blank out the working vanilla icon.
  test('omits FAVICON entirely for a brand that ships none', () => {
    const to = maintenanceDir()
    const from = tmp('ocelot-brand-')
    write(join(from, 'package.json'), JSON.stringify({ name: 'bare-branding' }))
    write(
      join(from, 'brand.config.mjs'),
      `export default (d) => d({ metadata: { applicationName: 'Bare' } })\n`,
    )
    brand(from, to)

    const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
      string,
      string
    >
    assert.equal('FAVICON' in meta, false)
  })

  // Reducing an archive entry to its basename would put two of them on one file. Both cases are
  // plausible: an OG image filed under its own directory, and font weights split by cut.
  describe('entries that share a basename', () => {
    test('keeps the logo and the OG image apart', () => {
      const to = maintenanceDir()
      const from = tmp('ocelot-brand-')
      write(join(from, 'package.json'), JSON.stringify({ name: 'twin-branding' }))
      write(
        join(from, 'brand.config.mjs'),
        `export default (defineBranding) =>
  defineBranding({
    logos: { signupPath: 'assets/logo.png' },
    metadata: { ogImage: 'assets/og/logo.png' },
  })
`,
      )
      write(join(from, 'assets/logo.png'), 'THE-LOGO')
      write(join(from, 'assets/og/logo.png'), 'THE-OG-IMAGE')

      brand(from, to)

      const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
        string,
        string
      >
      assert.notEqual(meta.LOGO, meta.OG_IMAGE)
      assert.equal(readText(to, join('public', meta.LOGO)), 'THE-LOGO')
      assert.equal(readText(to, join('public', meta.OG_IMAGE)), 'THE-OG-IMAGE')
    })

    test('keeps two font files with the same basename apart', () => {
      const to = maintenanceDir()
      const from = tmp('ocelot-brand-')
      write(join(from, 'package.json'), JSON.stringify({ name: 'cuts-branding' }))
      write(
        join(from, 'brand.config.mjs'),
        `export default (defineBranding) =>
  defineBranding({
    assets: { css: ['assets/brand.css'] },
  })
`,
      )
      write(join(from, 'assets/fonts/regular/Cuts.woff2'), 'REGULAR')
      write(join(from, 'assets/fonts/bold/Cuts.woff2'), 'BOLD')
      write(
        join(from, 'assets/brand.css'),
        [
          "@font-face { font-family: 'Cuts'; src: url('fonts/regular/Cuts.woff2'); font-weight: 400; }",
          "@font-face { font-family: 'Cuts'; src: url('fonts/bold/Cuts.woff2'); font-weight: 700; }",
        ].join('\n'),
      )

      brand(from, to)

      // Unpacking keeps the archive's directory structure, which is exactly what keeps two files of
      // the same name apart — and what lets the stylesheet's own relative urls keep working.
      assert.equal(readText(to, 'public/brand/fonts/regular/Cuts.woff2'), 'REGULAR')
      assert.equal(readText(to, 'public/brand/fonts/bold/Cuts.woff2'), 'BOLD')
    })
  })

  test('overlays only the locale namespaces the maintenance page renders', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    const de = readJson(to, 'app/locales/de.json')
    assert.equal(de.maintenance.explanation, 'Wir sind gleich zurück.')
    // The brand's WEBAPP namespace is not dragged in — a brand locale tree has hundreds of keys the
    // maintenance page has no use for, and every one of them would ship in the static output.
    assert.equal(de.site, undefined)
    // Untranslated keys are simply absent: i18n merges this ON TOP of the vanilla file, which keeps
    // them. Emitting them here would freeze a copy that silently goes stale.
    assert.equal(de.maintenance.title, undefined)
    assert.equal(de.localeSwitch, undefined)
    // A locale the brand does not translate gets no overlay at all.
    assert.equal(existsSync(join(to, 'app/locales/en.json')), false)
  })

  // The tree is ephemeral in Docker but is your working copy under `npm run brand` — a second run
  // must leave nothing of the first.
  describe('re-running', () => {
    test('drops the artifacts of the brand built before it', () => {
      const to = maintenanceDir()
      brand(brandDir(), to)
      assert.ok(existsSync(join(to, 'public/brand/fonts/acme.woff2')))
      assert.ok(existsSync(join(to, 'app/locales/de.json')))

      // A second brand, same maintenance tree: different font, no locales, no logo.
      const other = tmp('ocelot-brand-')
      write(join(other, 'package.json'), JSON.stringify({ name: 'other-branding' }))
      write(
        join(other, 'brand.config.mjs'),
        `export default (defineBranding) =>
  defineBranding({
    assets: { css: ['assets/brand.css'] },
  })
`,
      )
      write(join(other, 'assets/other.woff2'), Buffer.from('other-bytes'))
      write(
        join(other, 'assets/brand.css'),
        "@font-face { font-family: 'Other'; src: url('other.woff2') format('woff2'); }",
      )

      brand(other, to)

      assert.ok(existsSync(join(to, 'public/brand/other.woff2')))
      assert.equal(existsSync(join(to, 'public/brand/fonts/acme.woff2')), false)
      assert.equal(existsSync(join(to, 'app/locales/de.json')), false)
      // The second brand ships no logo, so the first one's must be gone. Asserted on the FILE, not on
      // the directory: logo and fonts now share public/brand, which this brand's font keeps alive.
      assert.equal(existsSync(join(to, 'public/brand/logo-squared.svg')), false)
    })

    test('is idempotent for the same brand', () => {
      const to = maintenanceDir()
      const from = brandDir()
      brand(from, to)
      const first = readText(to, 'app/constants/stylesheets.brand.json')

      brand(from, to)

      assert.equal(readText(to, 'app/constants/stylesheets.brand.json'), first)
    })
  })

  // A vanilla brand customises nothing — it must still produce a valid, empty-ish overlay rather than
  // leaving a previous brand's files in place.
  test('leaves no theme tokens or assets behind for a brand that customises nothing', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    const plain = tmp('ocelot-brand-')
    write(join(plain, 'package.json'), JSON.stringify({ name: 'plain-branding' }))
    write(
      join(plain, 'brand.config.mjs'),
      'export default (defineBranding) => defineBranding({})\n',
    )

    brand(plain, to)

    // No sheets to link, and — just as importantly — the previous brand's are gone from the list
    // rather than pointing at files that no longer exist.
    assert.deepEqual(readSheets(to), [])
    assert.equal(existsSync(join(to, 'public/brand')), false)
  })

  // Both arguments are checked, so both misses are worth pinning: dropping the second one is the
  // likelier slip at a prompt, and it is the case that would otherwise fail LATER and less clearly —
  // `resolve(undefined)` throws a TypeError, not a usage line.
  describe('missing arguments', () => {
    for (const [name, argv] of [
      ['none at all', []],
      ['only the brand dir', ['/some/brand']],
    ] as [string, string[]][]) {
      test(`reports usage for ${name}`, () => {
        assert.throws(
          () => execFileSync('node', [GENERATOR, ...argv], { stdio: 'pipe' }),
          /usage: build-maintenance-branding/,
        )
      })
    }
  })

  // An asset a brand references but never ships is a build-time mistake in the BRAND, not here: say so
  // and carry on, so one missing file cannot cost a deployment its whole maintenance page.
  test('warns about a referenced asset it cannot find, and still writes the rest', () => {
    const to = maintenanceDir()
    const from = tmp('ocelot-brand-')
    write(join(from, 'package.json'), JSON.stringify({ name: 'gap-branding' }))
    write(
      join(from, 'brand.config.mjs'),
      `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Gap' },
    assets: { css: ['assets/brand.css'] },
    logos: { signupPath: 'assets/nowhere.svg' },
  })
`,
    )
    write(
      join(from, 'assets/brand.css'),
      ":root { --color-primary: teal }\n@font-face { font-family: 'Nowhere'; src: url('nowhere.woff2') format('woff2'); }",
    )

    const { status, stderr } = run(from, to)

    assert.equal(status, 0) // a missing asset is a warning, never a failed build
    assert.match(stderr, /entry not in archive: assets\/nowhere\.svg/)
    assert.match(stderr, /entry not in archive: assets\/nowhere\.svg/)
    // The token lives in the linked sheet now; the generated list only points at it.
    assert.match(readText(to, 'public/brand/brand.css'), /--color-primary: teal/)
    assert.deepEqual(readSheets(to), ['/brand/brand.css'])
    const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
      string,
      string
    >
    // A present overlay key WINS, so one the brand cannot back with a file must be ABSENT, not null —
    // null would blank the vanilla value out instead of falling back to it.
    assert.ok(!('LOGO' in meta))
    assert.ok(!('OG_IMAGE' in meta))
    // …and the dimensions go with it: describing the vanilla image with the brand's numbers would be
    // a WRONG link preview rather than a missing one.
    for (const key of ['OG_IMAGE_ALT', 'OG_IMAGE_WIDTH', 'OG_IMAGE_HEIGHT', 'OG_IMAGE_TYPE']) {
      assert.ok(!(key in meta), `expected ${key} to be omitted`)
    }
    // What the brand CAN back is still there.
    assert.equal(meta.APPLICATION_NAME, 'Gap')
  })

  // The build only namespaces paths a brand writes relative to its own root; absolute and external
  // ones reach the generator verbatim. What each kind can mean differs HERE and nowhere else, because
  // this page is served with the webapp down — so all three are pinned together.
  describe('asset paths the build does not namespace', () => {
    /** A brand whose logo, OG image, favicon and stylesheet are all set to `path`. */
    function brandPointingAt(path: string): string {
      const from = tmp('ocelot-brand-external-')
      write(join(from, 'package.json'), JSON.stringify({ name: 'external-branding' }))
      write(
        join(from, 'brand.config.mjs'),
        `export default (d) =>
  d({
    metadata: { applicationName: 'Ext', ogImage: ${JSON.stringify(path)} },
    assets: { css: [${JSON.stringify(path)}], favicon: ${JSON.stringify(path)} },
    logos: { signupPath: ${JSON.stringify(path)} },
  })
`,
      )
      return from
    }

    const overlay = (dir: string): Record<string, string> =>
      readJson(dir, 'app/constants/metadata.brand.json') as unknown as Record<string, string>

    // An external URL is the one non-archive path that still WORKS here: a CDN stays up while the
    // webapp is down. Dropping it would replace a perfectly good asset with the vanilla one.
    test('keeps an external url verbatim, for every slot alike', () => {
      const to = maintenanceDir()
      const { status, stderr } = run(brandPointingAt('https://cdn.example/brand.ico'), to)

      assert.equal(status, 0)
      const meta = overlay(to)
      assert.equal(meta.FAVICON, 'https://cdn.example/brand.ico')
      assert.equal(meta.LOGO, 'https://cdn.example/brand.ico')
      assert.equal(meta.OG_IMAGE, 'https://cdn.example/brand.ico')
      assert.deepEqual(readSheets(to), ['https://cdn.example/brand.ico'])
      assert.equal(stderr, '')
    })

    // An absolute path into the framework's own tree is served BY THE WEBAPP. This page renders
    // precisely when that is down, so linking it would 404 on every request — the vanilla asset is
    // the better outcome, and the warning is what stops it being a mystery.
    test('drops a webapp-served path with a warning and keeps the vanilla asset', () => {
      const to = maintenanceDir()
      const { status, stderr } = run(brandPointingAt('/img/custom/logo.svg'), to)

      assert.equal(status, 0) // never fatal: one bad path must not cost a deployment its page
      const meta = overlay(to)
      // Omitted, not null — a present overlay key wins, so null would blank the vanilla value out
      // instead of falling through to it.
      for (const key of ['FAVICON', 'LOGO', 'OG_IMAGE']) assert.ok(!(key in meta), key)
      assert.deepEqual(readSheets(to), [])
      assert.ok(existsSync(join(to, 'public/favicon.ico'))) // the vanilla icon still answers
      assert.match(stderr, /favicon: \/img\/custom\/logo\.svg is served by the webapp/)
      assert.match(stderr, /stylesheet: \/img\/custom\/logo\.svg is served by the webapp/)
    })
  })

  // A brand may point at a font it serves itself (a CDN). There is nothing to copy out of the archive
  // then — reference it as given.
  test('leaves an external font url alone — the sheet travels verbatim', () => {
    const to = maintenanceDir()
    const from = tmp('ocelot-brand-')
    write(join(from, 'package.json'), JSON.stringify({ name: 'cdn-branding' }))
    write(
      join(from, 'brand.config.mjs'),
      `export default (defineBranding) =>
  defineBranding({
    assets: { css: ['assets/brand.css'] },
  })
`,
    )
    write(
      join(from, 'assets/brand.css'),
      "@font-face { font-family: 'Remote'; src: url('https://cdn.example/remote.woff2') format('woff2'); }",
    )

    brand(from, to)

    // Nothing rewrites the sheet, so an external src stays exactly as authored.
    assert.match(
      readText(to, 'public/brand/brand.css'),
      /url\('https:\/\/cdn\.example\/remote\.woff2'\)/,
    )
    assert.deepEqual(readSheets(to), ['/brand/brand.css'])
  })
})
