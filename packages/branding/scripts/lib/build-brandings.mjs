// Core of the brand build, shared by build-brand-archive.mjs (single-brand CLI + --watch), the dev
// scanner (build-dev-brandings.mjs) and the maintenance generator (build-maintenance-branding.mjs).
// Bundles a brand into ONE `<id>.tar.gz` as a LIBRARY of bucket instances: manifest.json +
// fragments/<type>.<name>.json (one sparse fragment per instance) + assets/ + html/. Consumers (webapp
// serverMiddleware, branding plugin, backend bootstrap, maintenance) read the manifest and COMPOSE the
// effective config (discover.composeArchive). See docu/branding-buckets-konzept.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BUCKET_NAMES, extractBucket, instanceFile, splitConfig } from '../../dist/buckets.js'
import { brandingDefaults } from '../../dist/defaults.js'
import { writeTarGz } from '../../dist/tar.js'

import { loadConfig } from './load-config.mjs'

// Version of THIS @ocelot-social/branding package — baked into every manifest as the schema/API
// compatibility axis (docu/branding-buckets-konzept.md §11), distinct from the brand's own version.
// Read from the package.json two dirs up (works from source and from an installed copy).
const SCHEMA_VERSION = (() => {
  try {
    const pkg = fileURLToPath(new URL('../../package.json', import.meta.url))
    return JSON.parse(readFileSync(pkg, 'utf8')).version || null
  } catch {
    return null
  }
})()

// Recursively collect a directory's files as tar entries keyed by their path relative to the brand
// root (e.g. dir='assets' → 'assets/logo.svg').
function collectFiles(dir, prefix, entries) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    if (statSync(full).isDirectory()) collectFiles(full, rel, entries)
    else entries.push({ name: rel, data: readFileSync(full) })
  }
}

// A brand-relative asset path (namespaced to /branding/<id>/…). Absolute /… and http(s):/data:/
// mailto: paths are framework/external and left untouched.
const isRelativeAsset = (v) =>
  typeof v === 'string' && v.length > 0 && !v.startsWith('/') && !/^(https?:|data:|mailto:)/.test(v)

function namespacePath(value, id, brandDir, warnings) {
  if (!isRelativeAsset(value)) return value
  if (!existsSync(join(brandDir, value))) {
    warnings.push(`  ! ${id}: referenced asset not found: ${value}`)
  }
  return `/branding/${id}/${value}`
}

/** Rewrite the known asset-path fields of a resolved config to the namespaced served location. */
function namespaceConfig(config, id, brandDir, warnings) {
  const ns = (v) => namespacePath(v, id, brandDir, warnings)
  const c = structuredClone(config)

  const LOGO_KEYS = [
    'headerPath',
    'headerTabletPath',
    'headerMobilePath',
    'signupPath',
    'welcomePath',
    'logoutPath',
    'passwordResetPath',
  ]
  for (const k of LOGO_KEYS) {
    if (c.logos?.[k] != null) c.logos[k] = ns(c.logos[k])
  }
  if (c.metadata?.ogImage != null) c.metadata.ogImage = ns(c.metadata.ogImage)
  if (Array.isArray(c.assets?.css)) c.assets.css = c.assets.css.map(ns)
  if (c.assets?.favicon != null) c.assets.favicon = ns(c.assets.favicon)
  if (c.assets?.html) {
    for (const page of Object.keys(c.assets.html)) {
      const locales = c.assets.html[page]
      for (const locale of Object.keys(locales)) locales[locale] = ns(locales[locale])
    }
  }
  // Brand web-font files live in the served assets folder too.
  if (Array.isArray(c.theme?.fontFaces)) {
    for (const face of c.theme.fontFaces) {
      if (face.src != null) face.src = ns(face.src)
    }
  }
  return c
}

/** Read the brand's package.json once (or null). */
function readBrandPkg(brandDir) {
  const pkgPath = join(brandDir, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return null
  }
}

export function brandId(brandDir) {
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
export function brandVersion(brandDir) {
  return readBrandPkg(brandDir)?.version || null
}

export function findConfig(brandDir) {
  for (const name of ['brand.config.ts', 'brand.config.mjs', 'brand.config.js']) {
    const p = join(brandDir, name)
    if (existsSync(p)) return p
  }
  return null
}

/** Bundle ONE brand directory into a `<id>.tar.gz` buffer (manifest.json + fragments/ + assets/ + html/). */
export async function buildBrandArchive(brandDir) {
  const dir = resolve(brandDir)
  const id = brandId(dir)
  const version = brandVersion(dir)
  const warnings = []
  const configPath = findConfig(dir)
  if (!configPath) throw new Error(`no brand.config.(ts|mjs|js) in ${dir}`)
  const config = await loadConfig(configPath)
  // OG image: if the brand didn't set its own, follow its squared logo (logos.signupPath). The old
  // deploy baked the brand's `static/img/custom/logo-squared.*` over the vanilla file; at runtime the
  // brand's logo lives under /branding/<id>/… instead, so derive the OG image from it — otherwise a
  // brand's link previews would show the vanilla ocelot logo (the untouched default path).
  const defaults = brandingDefaults
  if (
    config.metadata?.ogImage === defaults.metadata.ogImage &&
    config.logos?.signupPath &&
    config.logos.signupPath !== defaults.logos.signupPath
  ) {
    config.metadata.ogImage = config.logos.signupPath
  }
  const namespaced = namespaceConfig(config, id, dir, warnings)
  // The brand id + version live in manifest.json only (below), NOT in any config leaf: splitConfig
  // would drop a top-level `id` anyway (it is not a bucket-owned path), and injecting version into
  // metadata would make the identity bucket always look "customised", breaking partial-package
  // detection. Consumers read id/version from the manifest (see src/discover.ts).
  const label = config.metadata?.applicationName ?? id

  // Archive = a LIBRARY of bucket instances (docu/branding-buckets-konzept.md §11): each bucket type's
  // fragment is its own file `fragments/<type>.<name>.json`, indexed by manifest.json. A bucket is
  // emitted ONLY when the brand actually customises it (its owned slice differs from the framework
  // default) — so a package that defines only some buckets is genuinely PARTIAL. Unprovided buckets
  // are inherited from the framework default (or another source) at compose time (composeFromArchives).
  const entries = []
  const fragments = splitConfig(namespaced)
  const instances = []
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

  for (const sub of ['assets', 'html']) {
    const src = join(dir, sub)
    if (existsSync(src)) collectFiles(src, sub, entries)
  }
  return { id, version, label, gz: writeTarGz(entries), entries, warnings }
}

/**
 * Build ONE brand and PUBLISH it into a dist directory as `<id>.tar.gz` (latest — the name consumers
 * mount) plus, when the package.json version is set, `<id>-<version>.tar.gz` (immutable history).
 * `outDir` defaults to `<brandDir>/dist`. `markDefault` additionally writes a `DEFAULT` marker (the
 * brand id) so an image baking this brand renders branded out of the box.
 */
export async function publishBrandArchive(brandDir, { outDir, markDefault = false } = {}) {
  const built = await buildBrandArchive(brandDir)
  const dir = outDir ? resolve(outDir) : join(resolve(brandDir), 'dist')
  mkdirSync(dir, { recursive: true })
  const latest = join(dir, `${built.id}.tar.gz`)
  writeFileSync(latest, built.gz)
  let versioned = null
  if (built.version) {
    versioned = join(dir, `${built.id}-${built.version}.tar.gz`)
    writeFileSync(versioned, built.gz)
  }
  if (markDefault) writeFileSync(join(dir, 'DEFAULT'), `${built.id}\n`)
  return { ...built, dir, latest, versioned }
}
