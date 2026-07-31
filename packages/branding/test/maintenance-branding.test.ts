// The maintenance-page generator (scripts/build-maintenance-branding.ts), run END TO END as the
// Dockerfile and `npm run brand` run it: a real brand dir in, a real maintenance tree overwritten.
//
// It earns an integration test rather than unit coverage because what can go wrong is precisely what
// it does to OTHER trees — it rewrites committed sources and empties a directory. A mistake there is
// destructive, and only an end-to-end run exercises the argument handling, the archive round-trip and
// the file writes together.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const GENERATOR = fileURLToPath(
  new URL('../scripts/build-maintenance-branding.ts', import.meta.url),
)

const roots: string[] = []
after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  roots.push(dir)
  return dir
}

function write(file: string, body: string | Buffer): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}

const readText = (dir: string, rel: string): string => readFileSync(join(dir, rel), 'utf8')
const readJson = (dir: string, rel: string): Record<string, Record<string, string>> =>
  JSON.parse(readText(dir, rel))

/** A brand dir with a squared logo, one web font and a locale carrying maintenance + webapp strings. */
function brandDir(): string {
  const dir = tmp('ocelot-brand-')
  write(join(dir, 'package.json'), JSON.stringify({ name: 'acme-branding', version: '1.0.0' }))
  write(
    join(dir, 'brand.config.mjs'),
    `export default (defineBranding) =>
  defineBranding({
    metadata: { applicationName: 'Acme' },
    theme: {
      cssVars: { 'color-primary': 'rebeccapurple', 'font-family-text': "'Acme Sans', sans-serif" },
      fontFaces: [
        { family: 'Acme Sans', src: 'assets/fonts/acme.woff2', format: 'woff2', weight: '400' },
      ],
    },
    logos: { signupPath: 'assets/logo-squared.svg' },
  })
`,
  )
  write(join(dir, 'assets/logo-squared.svg'), '<svg id="brand"/>')
  write(join(dir, 'assets/fonts/acme.woff2'), Buffer.from('woff2-bytes'))
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

/** A maintenance tree: only the VANILLA locales matter as input — they decide which codes get an
 *  overlay. Everything else the generator produces is a file of its own. */
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
  return dir
}

/** The committed sources a brand must NEVER be written into. */
const COMMITTED = ['locales/de.json', 'locales/en.json']
function snapshot(dir: string): string[] {
  return COMMITTED.map((rel) => readText(dir, rel))
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

    assert.deepEqual(snapshot(to), before)
    for (const rel of [
      'app/assets/css/brand.css',
      'app/constants/metadata.brand.json',
      'app/locales/de.json',
      'public/img/brand/logo-squared.svg',
      'public/fonts/brand/acme.woff2',
    ]) {
      assert.ok(existsSync(join(to, rel)), `expected ${rel}`)
    }
  })

  test('emits the theme as its own stylesheet: font faces, then the tokens', () => {
    const to = maintenanceDir()
    brand(brandDir(), to)

    const css = readText(to, 'app/assets/css/brand.css')
    // The font FILE is served from the maintenance app, not from /branding/<id>/… (that route only
    // exists in the live webapp, which is down whenever this page is shown).
    assert.equal(readText(to, 'public/fonts/brand/acme.woff2'), 'woff2-bytes')
    assert.match(css, /@font-face \{[^}]*font-family: "Acme Sans";/)
    assert.match(css, /src: url\("\/fonts\/brand\/acme\.woff2"\) format\("woff2"\);/)
    assert.match(css, /font-weight: 400;/)
    // …and the token that names it, so `body { font-family: var(--font-family-text) }` resolves.
    assert.match(css, /--font-family-text: 'Acme Sans', sans-serif;/)
    assert.match(css, /--color-primary: rebeccapurple;/)
    assert.ok(css.indexOf('@font-face') < css.indexOf(':root'))
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
    assert.equal(readText(to, 'public/img/brand/logo-squared.svg'), '<svg id="brand"/>')
    assert.equal(meta.LOGO, '/img/brand/logo-squared.svg')
    assert.equal(meta.APPLICATION_NAME, 'Acme')
    // The composed ogImage is a /branding/<id>/… path this static site never serves — it has to be
    // rewritten to the copy that IS served, or every link preview 404s.
    assert.equal(meta.OG_IMAGE, '/img/brand/logo-squared.svg')
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
      assert.ok(existsSync(join(to, 'public/fonts/brand/acme.woff2')))
      assert.ok(existsSync(join(to, 'app/locales/de.json')))

      // A second brand, same maintenance tree: different font, no locales, no logo.
      const other = tmp('ocelot-brand-')
      write(join(other, 'package.json'), JSON.stringify({ name: 'other-branding' }))
      write(
        other + '/brand.config.mjs',
        `export default (defineBranding) =>
  defineBranding({
    theme: {
      cssVars: { 'font-family-text': "'Other', sans-serif" },
      fontFaces: [{ family: 'Other', src: 'assets/other.woff2', format: 'woff2' }],
    },
  })
`,
      )
      write(join(other, 'assets/other.woff2'), Buffer.from('other-bytes'))

      brand(other, to)

      assert.ok(existsSync(join(to, 'public/fonts/brand/other.woff2')))
      assert.equal(existsSync(join(to, 'public/fonts/brand/acme.woff2')), false)
      assert.equal(existsSync(join(to, 'app/locales/de.json')), false)
      assert.equal(existsSync(join(to, 'public/img/brand')), false)
    })

    test('is idempotent for the same brand', () => {
      const to = maintenanceDir()
      const from = brandDir()
      brand(from, to)
      const first = readText(to, 'app/assets/css/brand.css')

      brand(from, to)

      assert.equal(readText(to, 'app/assets/css/brand.css'), first)
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

    const css = readText(to, 'app/assets/css/brand.css')
    assert.equal(css.includes('@font-face'), false)
    assert.equal(css.includes('rebeccapurple'), false)
    assert.equal(existsSync(join(to, 'public/fonts/brand')), false)
    assert.equal(existsSync(join(to, 'public/img/brand')), false)
  })

  test('refuses to run without both arguments', () => {
    assert.throws(
      () => execFileSync('node', [GENERATOR], { stdio: 'pipe' }),
      /usage: build-maintenance-branding/,
    )
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
    theme: {
      cssVars: { 'color-primary': 'teal' },
      fontFaces: [{ family: 'Nowhere', src: 'assets/nowhere.woff2', format: 'woff2' }],
    },
    logos: { signupPath: 'assets/nowhere.svg' },
  })
`,
    )

    const { status, stderr } = run(from, to)

    assert.equal(status, 0) // a missing asset is a warning, never a failed build
    assert.match(stderr, /entry not in archive: assets\/nowhere\.woff2/)
    assert.match(stderr, /entry not in archive: assets\/nowhere\.svg/)
    assert.match(readText(to, 'app/assets/css/brand.css'), /--color-primary: teal;/)
    // No logo copied → the overlay names none, so app.vue keeps the vanilla one.
    const meta = readJson(to, 'app/constants/metadata.brand.json') as unknown as Record<
      string,
      string
    >
    assert.equal(meta.LOGO, undefined)
  })

  // A brand may point at a font it serves itself (a CDN). There is nothing to copy out of the archive
  // then — reference it as given.
  test('passes an absolute or external font src through untouched', () => {
    const to = maintenanceDir()
    const from = tmp('ocelot-brand-')
    write(join(from, 'package.json'), JSON.stringify({ name: 'cdn-branding' }))
    write(
      join(from, 'brand.config.mjs'),
      `export default (defineBranding) =>
  defineBranding({
    theme: {
      cssVars: { 'font-family-text': "'Remote', sans-serif" },
      fontFaces: [{ family: 'Remote', src: 'https://cdn.example/remote.woff2', format: 'woff2' }],
    },
  })
`,
    )

    brand(from, to)

    const css = readText(to, 'app/assets/css/brand.css')
    assert.match(css, /src: url\("https:\/\/cdn\.example\/remote\.woff2"\) format\("woff2"\);/)
    assert.equal(existsSync(join(to, 'public/fonts/brand')), false)
  })
})
