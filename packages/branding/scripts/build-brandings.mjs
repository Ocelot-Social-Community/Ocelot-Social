#!/usr/bin/env node
// Multi-brand build: bake N brands into ONE served folder, collision-free.
//
//   node scripts/build-brandings.mjs <out-dir> <brand-dir> [<brand-dir> ...]
//
// For each brand directory (containing brand.config.(ts|mjs), assets/, html/, optional package.json
// with a "brandId"):
//   1. Resolve + type-check its config (lib/load-config.mjs).
//   2. Copy its served content (assets/, html/) to <out-dir>/branding/<id>/.
//   3. Namespace every brand-relative asset path in the config to /branding/<id>/… so multiple
//      brands never collide (absolute /… and http(s):/data: paths are framework/external → left).
//   4. Write the namespaced config to <out-dir>/branding/<id>/branding.json.
// Finally write <out-dir>/branding/manifest.json listing every available brand — this is what the
// admin "switch branding" UI reads (menu only appears when the manifest is non-empty).
//
// The <out-dir> is served at /branding/* (dev: serverMiddleware from $OCELOT_BRANDING_ASSETS_DIR;
// prod: a mounted volume) — dynamically bound, NOT copied into the image. See
// docu/branding-architecture-konzept.md.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { loadConfig } from './lib/load-config.mjs'

const [outArg, ...brandArgs] = process.argv.slice(2)
if (!outArg || brandArgs.length === 0) {
  console.error('usage: build-brandings.mjs <out-dir> <brand-dir> [<brand-dir> ...]')
  process.exit(1)
}

const brandingRoot = join(resolve(outArg), 'branding')

// Config fields that hold a path into the brand's served folder — namespaced to /branding/<id>/.
const isRelativeAsset = (v) =>
  typeof v === 'string' &&
  v.length > 0 &&
  !v.startsWith('/') &&
  !/^(https?:|data:|mailto:)/.test(v)

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
  return c
}

function brandId(brandDir) {
  const pkgPath = join(brandDir, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (pkg.brandId) return pkg.brandId
    if (pkg.name) return pkg.name.replace(/-branding$/, '')
  }
  return basename(brandDir)
}

async function findConfig(brandDir) {
  for (const name of ['brand.config.ts', 'brand.config.mjs', 'brand.config.js']) {
    const p = join(brandDir, name)
    if (existsSync(p)) return p
  }
  throw new Error(`no brand.config.(ts|mjs|js) in ${brandDir}`)
}

const manifest = []
for (const brandArg of brandArgs) {
  const brandDir = resolve(brandArg)
  const id = brandId(brandDir)
  const outDir = join(brandingRoot, id)
  const warnings = []

  const config = await loadConfig(await findConfig(brandDir))
  const namespaced = namespaceConfig(config, id, brandDir, warnings)

  mkdirSync(outDir, { recursive: true })
  // Copy the served content dirs (config-referenced assets live here). locales ride in the JSON;
  // data/ and middlewares/ are build-time backend overlays, not served.
  for (const dir of ['assets', 'html']) {
    const src = join(brandDir, dir)
    if (existsSync(src)) cpSync(src, join(outDir, dir), { recursive: true })
  }
  writeFileSync(join(outDir, 'branding.json'), `${JSON.stringify(namespaced, null, 2)}\n`)

  manifest.push({
    id,
    label: config.metadata?.applicationName ?? id,
    config: `/branding/${id}/branding.json`,
  })
  // eslint-disable-next-line no-console
  console.log(`[brandings] ${basename(brandDir)} → /branding/${id}/ (${id})`)
  for (const w of warnings) console.warn(w)
}

mkdirSync(brandingRoot, { recursive: true })
writeFileSync(join(brandingRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
// eslint-disable-next-line no-console
console.log(`[brandings] ${manifest.length} brand(s) → ${join(brandingRoot, 'manifest.json')}`)
