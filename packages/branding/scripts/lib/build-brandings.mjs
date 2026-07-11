// Core of the multi-brand build, shared by the CLI (build-brandings.mjs) and the dev scanner
// (build-dev-brandings.mjs). Bundles each brand into ONE `<id>.tar.gz` under <out>/branding/
// containing its namespaced branding.json + assets/ + html/, plus a manifest.json listing them.
// Every consumer (webapp serverMiddleware, branding plugin, maintenance) reads the files back from
// the archive. See docu/branding-architecture-konzept.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

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

export function brandId(brandDir) {
  const pkgPath = join(brandDir, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (pkg.brandId) return pkg.brandId
    if (pkg.name) return pkg.name.replace(/-branding$/, '')
  }
  return basename(brandDir)
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
  const warnings = []
  const configPath = findConfig(dir)
  if (!configPath) throw new Error(`no brand.config.(ts|mjs|js) in ${dir}`)
  const config = await loadConfig(configPath)
  const namespaced = namespaceConfig(config, id, dir, warnings)

  const entries = [
    { name: 'branding.json', data: Buffer.from(`${JSON.stringify(namespaced, null, 2)}\n`) },
  ]
  for (const sub of ['assets', 'html']) {
    const src = join(dir, sub)
    if (existsSync(src)) collectFiles(src, sub, entries)
  }
  return { id, label: config.metadata?.applicationName ?? id, gz: writeTarGz(entries), entries, warnings }
}

/**
 * Bundle every brand directory in `brandArgs` into `<outArg>/branding/<id>.tar.gz` + a manifest.json.
 * Returns the manifest array ([{ id, label, config, archive }]).
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

  writeFileSync(join(brandingRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  // eslint-disable-next-line no-console
  console.log(`[brandings] ${manifest.length} brand(s) → ${join(brandingRoot, 'manifest.json')}`)
  return manifest
}
