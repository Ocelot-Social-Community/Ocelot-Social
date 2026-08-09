// Core of the brand build, shared by build-brand-archive.ts (single-brand CLI + --watch), the dev
// scanner (build-dev-brandings.ts) and the maintenance generator (build-maintenance-branding.ts).
// Bundles a brand into ONE `<id>.tar.gz` as a LIBRARY of bucket instances: manifest.json +
// fragments/<type>.<name>.json (one sparse fragment per instance) + assets/ + html/. Consumers (webapp
// serverMiddleware, branding plugin, backend bootstrap, maintenance) read the manifest and COMPOSE the
// effective config (discover.composeArchive). See docu/branding-buckets-konzept.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import postcss from 'postcss'

import { BUCKET_NAMES, extractBucket, instanceFile, splitConfig } from '../../dist/buckets.js'
import { brandingDefaults } from '../../dist/defaults.js'
import { deepMerge } from '../../dist/internal.js'
import { writeTarGz } from '../../dist/tar.js'
import { SCHEMA_VERSION } from '../../dist/version.js'
import { catalogAvailable, computeCatalog } from '../theme-catalog.ts'

import { customPropertiesIn } from './css.ts'
import { readImage } from './imageSize.ts'
import { loadConfig } from './load-config.ts'

import type { ArchiveInstanceEntry } from '../../dist/buckets.js'
import type { BrandingConfig } from '../../dist/index.js'

interface TarEntry {
  name: string
  data: Buffer
}
interface BrandPkg {
  brandId?: string
  name?: string
  version?: string
}

export interface BuiltArchive {
  id: string
  version: string | null
  label: string
  gz: Buffer
  entries: TarEntry[]
  warnings: string[]
}
export interface PublishedArchive extends BuiltArchive {
  dir: string
  latest: string
  versioned: string | null
}

// Recursively collect a directory's files as tar entries keyed by their path relative to the brand
// root (e.g. dir='assets' → 'assets/logo.svg').
function collectFiles(dir: string, prefix: string, entries: TarEntry[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    if (statSync(full).isDirectory()) collectFiles(full, rel, entries)
    else entries.push({ name: rel, data: readFileSync(full) })
  }
}

// A brand-relative asset path (namespaced to /branding/<id>/…). Absolute /… and http(s):/data:/
// mailto: paths are framework/external and left untouched.
const isRelativeAsset = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && !v.startsWith('/') && !/^(https?:|data:|mailto:)/.test(v)

function namespacePath(value: string, id: string, brandDir: string, warnings: string[]): string {
  if (!isRelativeAsset(value)) return value
  if (!existsSync(join(brandDir, value))) {
    warnings.push(`  ! ${id}: referenced asset not found: ${value}`)
  }
  return `/branding/${id}/${value}`
}

const LOGO_KEYS = [
  'headerPath',
  'headerTabletPath',
  'headerMobilePath',
  'signupPath',
  'welcomePath',
  'logoutPath',
  'passwordResetPath',
] as const

/** Rewrite the known asset-path fields of a resolved config to the namespaced served location. The
 *  dynamic-key writes operate on loose record views (trusted, schema-fixed keys — see eslint config). */
function namespaceConfig(
  config: BrandingConfig,
  id: string,
  brandDir: string,
  warnings: string[],
): BrandingConfig {
  const ns = (v: string): string => namespacePath(v, id, brandDir, warnings)
  const c = structuredClone(config)

  const logos = c.logos as unknown as Record<string, string | undefined>
  for (const k of LOGO_KEYS) {
    const val = logos[k]
    if (val != null) logos[k] = ns(val)
  }
  c.metadata.ogImage = ns(c.metadata.ogImage) // ogImage is always set (merged default)
  if (Array.isArray(c.assets.css)) c.assets.css = c.assets.css.map(ns)
  if (c.assets.favicon != null) c.assets.favicon = ns(c.assets.favicon)
  if (c.assets.icon != null) c.assets.icon = ns(c.assets.icon)
  const html = c.assets.html as Record<string, Record<string, string>>
  for (const page of Object.keys(html)) {
    const locales = html[page]
    for (const locale of Object.keys(locales)) locales[locale] = ns(locales[locale])
  }
  // Brand web-font files live in the served assets folder too.
  // The header's custom-button icon is a brand asset like any logo (it used to be a framework-served
  // /img/custom/… path, which is why it was missed here at first).
  const customButton = c.headerMenu.customButton as unknown as Record<string, string | undefined>
  if (customButton.iconPath != null) customButton.iconPath = ns(customButton.iconPath)
  return c
}

/** Read the brand's package.json once (or null). */
function readBrandPkg(brandDir: string): BrandPkg | null {
  const pkgPath = join(brandDir, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')) as BrandPkg
  } catch {
    return null
  }
}

export function brandId(brandDir: string): string {
  const pkg = readBrandPkg(brandDir)
  if (pkg?.brandId) return pkg.brandId
  if (pkg?.name) return pkg.name.replace(/-branding$/, '')
  return basename(brandDir)
}

/**
 * The brand's published version = its package.json `version` (single source) verbatim, or null only
 * when there is no package.json / no version field. NOTE: `0.0.0` is NOT hidden — a brand always
 * carries the version it declares, so the archive is always versioned. Bump the brand's package.json
 * `version` to give it a real one.
 */
export function brandVersion(brandDir: string): string | null {
  return readBrandPkg(brandDir)?.version ?? null
}

export function findConfig(brandDir: string): string | null {
  for (const name of ['brand.config.ts', 'brand.config.mjs', 'brand.config.js']) {
    const p = join(brandDir, name)
    if (existsSync(p)) return p
  }
  return null
}

// A locale-code directory name (2–3 letters + optional region), e.g. 'en', 'de', 'pt-BR'. Plus a
// denylist for the legacy non-locale folders some brands still carry under locales/ (tmp/, html/).
// (Fully bounded + anchored quantifiers → no catastrophic backtracking; the heuristic is a false alarm.)
// eslint-disable-next-line security/detect-unsafe-regex
const LOCALE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/
const LEGACY_LOCALE_DIRS = new Set(['tmp', 'html'])

/**
 * Read a brand's i18n override files under `<brandDir>/locales/` and deep-merge them into
 * `config.locales` — so a brand can author overrides as conventional JSON instead of inline in
 * brand.config. Two layouts, both supported and mergeable:
 *   • `locales/<code>.json`            — the whole locale in one file.
 *   • `locales/<code>/<feature>.json`  — MODULAR: a locale split into per-feature namespace files, all
 *                                        merged into that locale's tree (filename organisational; the
 *                                        content uses the app's real key paths). Lets a feature own its
 *                                        locale slice; the build "links" them via deep-merge.
 * A file WINS over an inline `config.locales[code]`; within a locale, files merge in sorted order (deep,
 * later wins). The RUNTIME is unchanged (locales still ride in the composed config). Non-locale folders
 * (legacy `locales/tmp` / `locales/html`, or anything not matching a locale code) are ignored.
 */
/**
 * A brand authors its theme as CSS. This reads the stylesheets it lists under `assets.css` for two
 * purposes, and stores nothing else about the theme:
 *
 *  1. `theme.themeColor` — the resolved `--color-primary`. The PWA manifest is generated per request
 *     and cannot resolve `var()`, so this one value has to travel as a concrete colour. It is read
 *     from an UNCONDITIONAL `:root` only: a manifest has no media queries, so a value that holds just
 *     inside `@media (prefers-color-scheme: dark)` would be shipped as if it always applied.
 *  2. The specificity guarantee. A brand's `:root` only outranks the framework's `:root` by being
 *     loaded later, and it is not: with `build.extractCSS: false` the app CSS is injected by
 *     vue-style-loader during hydration, AFTER anything the server put in <head>. So the packed copy
 *     of each stylesheet has its `:root` selectors rewritten to `:root:root`, which wins on
 *     specificity no matter the order. The brand's source file is untouched — only what ships changes.
 */
function loadThemeFromStylesheets(
  dir: string,
  id: string,
  config: BrandingConfig,
  warnings: string[],
): Record<string, string> {
  const declared: Record<string, string> = {}
  const unconditional: Record<string, string> = {}
  for (const rel of config.assets.css) {
    const file = join(dir, rel)
    if (!existsSync(file)) {
      warnings.push(`  ! ${id}: assets.css lists '${rel}', which does not exist`)
      continue
    }
    const css = readFileSync(file, 'utf8')
    try {
      Object.assign(declared, customPropertiesIn(css))
      Object.assign(unconditional, customPropertiesIn(css, { topLevelOnly: true }))
    } catch (err) {
      // A brand's own file — warn and carry on with what the other sheets declared, rather than
      // failing everyone else's build over one unparseable stylesheet.
      warnings.push(
        `  ! ${id}: assets.css '${rel}' is not parseable CSS — ${(err as Error).message}`,
      )
    }
  }
  if (unconditional['color-primary']) config.theme.themeColor = unconditional['color-primary']
  else if (declared['color-primary'])
    warnings.push(
      `  ! ${id}: --color-primary is only declared inside an at-rule, so it cannot become the PWA` +
        ` theme colour — declare it on a plain ':root' as well`,
    )
  return declared
}

/**
 * `:root` → `:root:root` in a packed stylesheet — see loadThemeFromStylesheets for why.
 *
 * Rewrites SELECTORS, which is why it parses rather than replaces text: to a regex a `}` inside a
 * string or a comment looks exactly like the end of a rule, so `content: "}:root {"` used to come out
 * of the build silently altered. Everything postcss did not touch is re-serialised from its original
 * raws, so the packed file keeps the author's formatting verbatim.
 *
 * An unparseable stylesheet is shipped unchanged: it loses the specificity boost, which is a styling
 * problem for that one brand, rather than failing a build that may cover many. loadThemeFromStylesheets
 * has already warned about the same file by the time we get here.
 */
export function outSpecifyRoot(css: string): string {
  let root
  try {
    root = postcss.parse(css)
  } catch {
    return css
  }
  root.walkRules((rule) => {
    rule.selectors = rule.selectors.map((s) => s.replace(/^:root(?!:root)/, ':root:root'))
  })
  return root.toString()
}

function loadLocaleFiles(
  dir: string,
  id: string,
  config: BrandingConfig,
  warnings: string[],
): void {
  const localesDir = join(dir, 'locales')
  if (!existsSync(localesDir)) return
  const merge = (code: string, file: string, label: string): void => {
    try {
      const strings = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
      config.locales[code] = deepMerge(config.locales[code] ?? {}, strings)
    } catch {
      warnings.push(`  ! ${id}: invalid locale JSON: ${label}`)
    }
  }
  const entries = readdirSync(localesDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      merge(basename(entry.name, '.json'), join(localesDir, entry.name), `locales/${entry.name}`)
    } else if (
      entry.isDirectory() &&
      LOCALE_CODE.test(entry.name) &&
      !LEGACY_LOCALE_DIRS.has(entry.name)
    ) {
      const code = entry.name
      const featureFiles = readdirSync(join(localesDir, code))
        .filter((n) => n.endsWith('.json'))
        .sort()
      for (const f of featureFiles) merge(code, join(localesDir, code, f), `locales/${code}/${f}`)
    }
  }
}

// Levenshtein edit distance (single-row rolling — bounded, build-time only).
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/**
 * Warn on a declared custom property that is a near-miss of a known theme token (likely a typo → a
 * silent no-op at runtime). The set is intentionally OPEN — a brand may define custom `--vars` for its CSS
 * — so only CLOSE matches are flagged (edit distance ≤ 2, similar length), never every unknown key.
 */
function warnThemeTokenTypos(
  declared: Record<string, string>,
  id: string,
  warnings: string[],
): void {
  // Live from the webapp's stylesheets. Where they are not reachable (a brand's own repo) there is
  // nothing to compare against, and a guess would produce false warnings — so skip the check.
  if (!catalogAvailable()) return
  const known = Object.keys(computeCatalog())
  for (const key of Object.keys(declared)) {
    if (known.includes(key)) continue
    const near = known.find(
      (k) => Math.abs(k.length - key.length) <= 1 && editDistance(key, k) <= 2,
    )
    if (near) {
      warnings.push(`  ! ${id}: --${key} is not a known theme token — did you mean --${near}?`)
    }
  }
}

// Stylesheet SOURCE formats. The archive packs assets/ verbatim and the runtime only ever injects the
// files listed in `assets.css` as <link rel=stylesheet> — nothing compiles. So a source stylesheet in
// a brand is always dead weight.
const STYLE_SOURCE_EXT = /\.(scss|sass|less|styl)$/i

/**
 * Warn on a SOURCE stylesheet under assets/. Brands migrated from the old mechanism still carry the
 * build-time `assets/styles/imports/_branding.scss` overlay, which the webapp Dockerfile used to copy
 * over webapp/ before `yarn build`. The nuxt bundle is brand-agnostic now — that file is packed into
 * the archive but NEVER compiled or served, so every rule in it silently stopped applying. Port it to
 * plain CSS (resolving SCSS variables to literals / `var(--…)` theme tokens) and list it in
 * `assets.css`, which IS injected at runtime.
 */
function warnUncompiledStylesheets(entries: TarEntry[], id: string, warnings: string[]): void {
  for (const entry of entries) {
    if (!entry.name.startsWith('assets/') || !STYLE_SOURCE_EXT.test(entry.name)) continue
    warnings.push(
      `  ! ${id}: ${entry.name} is a SOURCE stylesheet — it is packed but NEVER compiled or served. ` +
        `Port it to plain CSS and list it in assets.css.`,
    )
  }
}

/**
 * The size `assets.icon` is DECLARED at — the PWA manifest lists it as both 192×192 and 512×512
 * (webapp/server-middleware/manifest.js), so anything smaller is upscaled by the browser to fill the
 * larger slot.
 */
const ICON_MIN_PX = 512

/**
 * Warn when `assets.icon` cannot do the job the slot exists for: the iOS home-screen icon and the PWA
 * install icon. Both consume it as a fixed-size square bitmap, and neither reports back — a wrong file
 * shows up as a stretched or blurred icon on someone's phone, or as no icon at all, long after the
 * build that accepted it.
 *
 * Warnings only, like every other check here: a brand's icon is not worth failing a deployment over,
 * and the slot is optional to begin with.
 */
function warnIconAsset(dir: string, id: string, config: BrandingConfig, warnings: string[]): void {
  const rel = config.assets.icon
  // Only a brand-relative path names a file this build can read; an external URL or an absolute
  // framework path is not ours to inspect (see namespacePath).
  if (!isRelativeAsset(rel)) return
  const file = join(dir, rel)
  if (!existsSync(file)) return // already reported by namespacePath as "referenced asset not found"

  const image = readImage(readFileSync(file))
  if (!image) {
    warnings.push(`  ! ${id}: assets.icon '${rel}' is not an image format this build recognises`)
    return
  }
  if (!image.raster) {
    // The consumers label the icon by EXTENSION, so this travels into the manifest as
    // `type: image/svg+xml` — and a browser that took the declared type at its word drops an install
    // icon it will not rasterise, rather than falling back to sniffing the file.
    warnings.push(
      `  ! ${id}: assets.icon '${rel}' is ${image.format.toUpperCase()}, not a raster image — the PWA ` +
        `manifest and apple-touch-icon need a bitmap; ship a ${ICON_MIN_PX}px square PNG`,
    )
    return
  }
  if (image.width === null || image.height === null) {
    warnings.push(
      `  ! ${id}: assets.icon '${rel}' is a truncated ${image.format.toUpperCase()} file`,
    )
    return
  }
  if (image.width !== image.height) {
    warnings.push(
      `  ! ${id}: assets.icon '${rel}' is ${image.width}×${image.height}, not square — a home-screen ` +
        `tile stretches it to fit`,
    )
  } else if (image.width < ICON_MIN_PX) {
    warnings.push(
      `  ! ${id}: assets.icon '${rel}' is ${image.width}px — the manifest declares it at ` +
        `${ICON_MIN_PX}px, so it will be upscaled`,
    )
  }
}

/**
 * Warn on a leftover `public/` folder. That bucket used to be overlaid onto the BACKEND's on-disk
 * `public/` at bootstrap, and every brand used it for exactly one thing: badge SVGs. It is gone —
 * badges are served brand files like logos, so they belong in `assets/badges/` and are read straight
 * from the archive. A brand that still ships `public/` would silently lose those icons (they are no
 * longer packed at all), so say so loudly at build time.
 */
function warnRemovedPublicBucket(dir: string, id: string, warnings: string[]): void {
  if (!existsSync(join(dir, 'public'))) return
  warnings.push(
    `  ! ${id}: public/ is NO LONGER PACKED — move its files to assets/badges/ and point the badge ` +
      `seed data at /branding/${id}/assets/badges/<file>.svg.`,
  )
}

/** Bundle ONE brand directory into a `<id>.tar.gz` buffer (manifest.json + fragments/ + assets/ + html/). */
export async function buildBrandArchive(brandDir: string): Promise<BuiltArchive> {
  const dir = resolve(brandDir)
  const id = brandId(dir)
  const version = brandVersion(dir)
  const warnings: string[] = []
  const configPath = findConfig(dir)
  if (!configPath) throw new Error(`no brand.config.(ts|mjs|js) in ${dir}`)
  const config = await loadConfig(configPath)
  // Brands may author i18n overrides as conventional locales/<code>.json files (in addition to, or
  // instead of, inline config.locales) — merge those in now. Runtime shape is unchanged.
  loadLocaleFiles(dir, id, config, warnings)
  // Theme authored as CSS: the brand's stylesheets are the single source. Only the PWA colour is
  // lifted out of them into the config; the declarations themselves stay in the files.
  const declaredTokens = loadThemeFromStylesheets(dir, id, config, warnings)
  warnThemeTokenTypos(declaredTokens, id, warnings)
  // OG image: if the brand didn't set its own, follow its squared logo (logos.signupPath). The old
  // deploy baked the brand's `static/img/custom/logo-squared.*` over the vanilla file; at runtime the
  // brand's logo lives under /branding/<id>/… instead, so derive the OG image from it — otherwise a
  // brand's link previews would show the vanilla ocelot logo (the untouched default path).
  const defaults = brandingDefaults
  if (
    config.metadata.ogImage === defaults.metadata.ogImage &&
    config.logos.signupPath &&
    config.logos.signupPath !== defaults.logos.signupPath
  ) {
    config.metadata.ogImage = config.logos.signupPath
  }
  const namespaced = namespaceConfig(config, id, dir, warnings)
  // The brand id + version live in manifest.json only (below), NOT in any config leaf: splitConfig
  // would drop a top-level `id` anyway (it is not a bucket-owned path), and injecting version into
  // metadata would make the identity bucket always look "customised", breaking partial-package
  // detection. Consumers read id/version from the manifest (see src/discover.ts).
  const label = config.metadata.applicationName // always set (merged default)

  // Archive = a LIBRARY of bucket instances (docu/branding-buckets-konzept.md §11): each bucket type's
  // fragment is its own file `fragments/<type>.<name>.json`, indexed by manifest.json. A bucket is
  // emitted ONLY when the brand actually customises it (its owned slice differs from the framework
  // default) — so a package that defines only some buckets is genuinely PARTIAL. Unprovided buckets
  // are inherited from the framework default (or another source) at compose time (composeFromArchives).
  const entries: TarEntry[] = []
  const fragments = splitConfig(namespaced)
  const instances: ArchiveInstanceEntry[] = []
  for (const type of BUCKET_NAMES) {
    const owned = JSON.stringify(extractBucket(namespaced, type))
    const ownedDefault = JSON.stringify(extractBucket(brandingDefaults, type))
    if (owned === ownedDefault) continue // not customised → don't provide this bucket
    const name = 'default'
    const file = instanceFile(type, name)
    entries.push({ name: file, data: Buffer.from(`${JSON.stringify(fragments[type], null, 2)}\n`) })
    instances.push({ type, name, file })
  }
  const manifest = { id, version: version ?? null, schemaVersion: SCHEMA_VERSION, label, instances }
  entries.push({
    name: 'manifest.json',
    data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  })

  // Raw brand file trees packed verbatim into the archive for runtime consumers to extract:
  //   assets/  served brand files (logos, favicon, fonts, css, badge SVGs) — /branding/<id>/assets/…
  //   html/    brand static-page HTML (per locale), served the same way
  //   emails/  backend e-mail templates (pug) + locales, overlaid onto the defaults at bootstrap
  //
  // Only `emails/` is written to disk at runtime: email-templates reads from the filesystem, so HTTP
  // is not an option there. Everything else is served straight FROM the archive by the webapp's
  // branding-assets middleware — nothing is copied into an image.
  for (const sub of ['assets', 'html', 'emails']) {
    const src = join(dir, sub)
    if (existsSync(src)) collectFiles(src, sub, entries)
  }

  // The brand's own stylesheets ship with their `:root` raised to `:root:root` — see
  // loadThemeFromStylesheets. Applied to the PACKED copy only; the file in the brand repo stays as the
  // author wrote it.
  const sheetEntries = new Set(
    config.assets.css.map((href) => href.replace(/^\/branding\/[^/]+\//, '')),
  )
  for (const entry of entries) {
    if (!sheetEntries.has(entry.name)) continue
    entry.data = Buffer.from(outSpecifyRoot(entry.data.toString('utf8')))
  }
  warnUncompiledStylesheets(entries, id, warnings)
  warnRemovedPublicBucket(dir, id, warnings)
  warnIconAsset(dir, id, config, warnings)
  return { id, version, label, gz: writeTarGz(entries), entries, warnings }
}

/**
 * Build ONE brand and PUBLISH it into a dist directory as `<id>.tar.gz` (latest — the name consumers
 * mount) plus, when the package.json version is set, `<id>-<version>.tar.gz` (immutable history).
 * `outDir` defaults to `<brandDir>/dist`. `markDefault` additionally writes a `DEFAULT` marker (the
 * brand id) so an image baking this brand renders branded out of the box.
 */
export async function publishBrandArchive(
  brandDir: string,
  { outDir, markDefault = false }: { outDir?: string; markDefault?: boolean } = {},
): Promise<PublishedArchive> {
  const built = await buildBrandArchive(brandDir)
  const dir = outDir ? resolve(outDir) : join(resolve(brandDir), 'dist')
  mkdirSync(dir, { recursive: true })
  const latest = join(dir, `${built.id}.tar.gz`)
  writeFileSync(latest, built.gz)
  let versioned: string | null = null
  if (built.version) {
    versioned = join(dir, `${built.id}-${built.version}.tar.gz`)
    writeFileSync(versioned, built.gz)
  }
  if (markDefault) writeFileSync(join(dir, 'DEFAULT'), `${built.id}\n`)
  return { ...built, dir, latest, versioned }
}
