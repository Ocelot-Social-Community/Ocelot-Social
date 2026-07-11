// Core of the multi-brand build, shared by the CLI (build-brandings.mjs) and the dev scanner
// (build-dev-brandings.mjs). Bakes N brand directories into ONE served folder, collision-free:
// per brand it copies the served content (assets/, html/) to <out>/branding/<id>/, namespaces every
// brand-relative asset path in the resolved config to /branding/<id>/…, writes branding.json, and
// finally writes <out>/branding/manifest.json. See docu/branding-architecture-konzept.md.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { loadConfig } from './load-config.mjs'

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

/**
 * Build every brand directory in `brandArgs` into `<outArg>/branding/`.
 * Returns the manifest array ([{ id, label, config }]).
 */
export async function buildBrandings(outArg, brandArgs) {
  const brandingRoot = join(resolve(outArg), 'branding')
  const manifest = []

  for (const brandArg of brandArgs) {
    const brandDir = resolve(brandArg)
    const id = brandId(brandDir)
    const outDir = join(brandingRoot, id)
    const warnings = []

    const configPath = findConfig(brandDir)
    if (!configPath) throw new Error(`no brand.config.(ts|mjs|js) in ${brandDir}`)
    const config = await loadConfig(configPath)
    const namespaced = namespaceConfig(config, id, brandDir, warnings)

    mkdirSync(outDir, { recursive: true })
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
  return manifest
}
