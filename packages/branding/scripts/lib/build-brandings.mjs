// Core of the multi-brand build, shared by the CLI (build-brandings.mjs) and the dev scanner
// (build-dev-brandings.mjs). Bundles each brand into ONE `<id>.tar.gz` under <out>/branding/ as a
// LIBRARY of bucket instances: manifest.json + fragments/<type>.<name>.json (one sparse fragment per
// instance) + assets/ + html/. Consumers (webapp serverMiddleware, branding plugin, backend bootstrap,
// maintenance) read the manifest and COMPOSE the effective config (discover.composeArchive). See
// docu/branding-buckets-konzept.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { BUCKET_NAMES, instanceFile, splitConfig } from '../../dist/buckets.js'
import { brandingDefaults } from '../../dist/defaults.js'
import { writeTarGz } from '../../dist/tar.js'

import { loadConfig } from './load-config.mjs'

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

/** The brand's published version = its package.json `version` (single source), or null if unset. */
export function brandVersion(brandDir) {
  const version = readBrandPkg(brandDir)?.version
  // '0.0.0' is the unset placeholder in the brand templates — treat it as "no version".
  return version && version !== '0.0.0' ? version : null
}

export function findConfig(brandDir) {
  for (const name of ['brand.config.ts', 'brand.config.mjs', 'brand.config.js']) {
    const p = join(brandDir, name)
    if (existsSync(p)) return p
  }
  return null
}

/** Bundle ONE brand directory into a `<id>.tar.gz` buffer (branding.json + assets/ + html/). */
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
  // Stamp the brand id into branding.json so consumers can discover archives by content (the file
  // name may be versioned, e.g. `<id>-1.2.3.tar.gz`) — see src/discover.ts.
  namespaced.id = id
  // Inject the version from package.json (single source) — surfaced in the admin Branding tab.
  if (version) namespaced.metadata = { ...namespaced.metadata, version }

  const label = config.metadata?.applicationName ?? id

  // Archive = a LIBRARY of bucket instances (docu/branding-buckets-konzept.md §11): each bucket type's
  // fragment is its own file `buckets/<type>.<name>.json`, indexed by manifest.json. A classic full
  // brand yields one instance per type named `default` (splitConfig). Multiple instances of the same
  // type (e.g. theme dark/light) are an authoring feature layered on this format later.
  const entries = []
  const fragments = splitConfig(namespaced)
  const instances = []
  for (const type of BUCKET_NAMES) {
    const name = 'default'
    const file = instanceFile(type, name)
    entries.push({ name: file, data: Buffer.from(`${JSON.stringify(fragments[type], null, 2)}\n`) })
    instances.push({ type, name, file })
  }
  const manifest = { id, version: version ?? null, label, instances }
  entries.push({ name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) })

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

/**
 * Bundle every brand directory in `brandArgs` into `<outArg>/branding/<id>.tar.gz`. The served
 * manifest is derived dynamically from the archives present, so none is written here.
 * Returns the built list ([{ id, label, config, archive }]).
 */
export async function buildBrandings(outArg, brandArgs) {
  const brandingRoot = join(resolve(outArg), 'branding')
  mkdirSync(brandingRoot, { recursive: true })
  const manifest = []

  for (const brandArg of brandArgs) {
    const { id, label, gz, entries, warnings } = await buildBrandArchive(brandArg)
    writeFileSync(join(brandingRoot, `${id}.tar.gz`), gz)
    manifest.push({
      id,
      label,
      archive: `${id}.tar.gz`,
      // Served (from the archive) by the branding-assets middleware — the admin UI fetches this.
      config: `/branding/${id}/branding.json`,
    })
    // eslint-disable-next-line no-console
    console.log(`[brandings] ${basename(resolve(brandArg))} → ${id}.tar.gz (${entries.length} files, ${gz.length} b)`)
    for (const w of warnings) console.warn(w)
  }

  // No static manifest.json is written: the served /branding/manifest.json is derived DYNAMICALLY
  // from the archives actually present (webapp serverMiddleware), so the admin list can never drift
  // from what was built — even when archives are added/removed/built individually.
  // eslint-disable-next-line no-console
  console.log(`[brandings] ${manifest.length} brand(s) → ${brandingRoot}`)
  return manifest
}
