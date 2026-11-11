// Resolve a BRAND REPO — the build context of a downstream brand build (`FROM backend-build` / `FROM
// webapp-build` / `FROM maintenance-build`), or a config dir under deployment/configurations/<name> —
// into the brands it holds.
//
// Two layouts:
//   • brandings/<name>/   one directory per brand; a repo may hold several. Each one with a
//                         brand.config.* becomes its own archive, so the live network can switch between
//                         them (activeBranding) or compose them per bucket (brandingComposition).
//   • branding/           the original single-brand layout. Still built, with a deprecation warning.
// Both at once is an error: the repo would hold two answers to which brand it is.
//
// There is no build-time "default brand". Which brand a network renders is deployment configuration —
// the activeBranding policy, else $OCELOT_ACTIVE_BRANDING — so one set of images serves every brand of
// the repo. The one exception is a repo with a SOLE brand: that one is marked as the image's fallback,
// as before, so a single-brand deployment needs no configuration at all.
//
// What cannot follow a runtime choice is solved without one:
//   • the static maintenance page is generated once per brand and picked when its container starts
//     (see build-maintenance-sites.ts);
//   • the backend overlays (middlewares/, data/) are compiled into the image, so at most ONE brand may
//     ship them — two would need a choice the image cannot make.
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { brandId, findConfig } from './build-brandings.ts'

export const LEGACY_DIR = 'branding'
export const BRANDINGS_DIR = 'brandings'
/** The env var a deployment names its brand with; read by the backend, the webapp and the maintenance page. */
export const ACTIVE_BRANDING_ENV = 'OCELOT_ACTIVE_BRANDING'
/** Backend overlay folders: code and seed data compiled into the image, so only one brand can have them. */
export const OVERLAY_DIRS = ['middlewares', 'data']

export interface RepoBrand {
  /** Directory name (`branding` for the legacy layout). */
  name: string
  dir: string
  id: string
}

export interface BrandRepo {
  layout: 'brandings' | 'legacy' | 'none'
  /** Every brand with a brand.config.*, sorted by directory name. */
  brands: RepoBrand[]
  /** The repo's only brand, or null when it holds none or several — the image's fallback brand. */
  soleBrand: RepoBrand | null
  /**
   * The folder whose middlewares/ and data/ are compiled into the backend image: the one brand that
   * ships them, or a legacy `branding/` even without a brand.config — old-format brands still keep
   * them there. Null when there is none.
   */
  overlayDir: string | null
  warnings: string[]
}

const isDir = (p: string): boolean => existsSync(p) && statSync(p).isDirectory()

// A directory that holds nothing counts as absent: `COPY branding[s]/ …` in an ONBUILD trigger creates
// its target even when the brand repo has no such folder.
const hasContent = (p: string): boolean => isDir(p) && readdirSync(p).length > 0

// An overlay folder only matters when it holds more than the `.gitkeep` that keeps it in git.
const hasOverlayFiles = (dir: string): boolean =>
  OVERLAY_DIRS.some(
    (sub) => isDir(join(dir, sub)) && readdirSync(join(dir, sub)).some((f) => f !== '.gitkeep'),
  )

const names = (brands: RepoBrand[]): string => brands.map((b) => b.name).join(', ')

export function resolveBrandRepo(root: string): BrandRepo {
  const repo = resolve(root)
  const legacyDir = join(repo, LEGACY_DIR)
  const multiDir = join(repo, BRANDINGS_DIR)
  const hasLegacy = hasContent(legacyDir)
  const hasMulti = hasContent(multiDir)
  const warnings: string[] = []

  if (hasLegacy && hasMulti) {
    throw new Error(
      `[brand-repo] ${repo} has both ${LEGACY_DIR}/ and ${BRANDINGS_DIR}/ — move ${LEGACY_DIR}/ to ${BRANDINGS_DIR}/<name>/`,
    )
  }

  if (hasLegacy) {
    warnings.push(
      `[brand-repo] ${LEGACY_DIR}/ is deprecated — move it to ${BRANDINGS_DIR}/<name>/, which can hold several brands`,
    )
    const brands = findConfig(legacyDir)
      ? [{ name: LEGACY_DIR, dir: legacyDir, id: brandId(legacyDir) }]
      : []
    return {
      layout: 'legacy',
      brands,
      soleBrand: brands[0] ?? null,
      overlayDir: legacyDir,
      warnings,
    }
  }

  if (!hasMulti) {
    return { layout: 'none', brands: [], soleBrand: null, overlayDir: null, warnings }
  }

  const brands: RepoBrand[] = []
  for (const name of readdirSync(multiDir).sort()) {
    const dir = join(multiDir, name)
    if (!isDir(dir)) {
      continue
    }
    if (findConfig(dir)) {
      brands.push({ name, dir, id: brandId(dir) })
    } else {
      warnings.push(`[brand-repo] ${BRANDINGS_DIR}/${name}/ has no brand.config.* — skipped`)
    }
  }

  const seen = new Map<string, string>()
  for (const brand of brands) {
    const other = seen.get(brand.id)
    if (other) {
      throw new Error(
        `[brand-repo] ${BRANDINGS_DIR}/${other}/ and ${BRANDINGS_DIR}/${brand.name}/ share the brand id "${brand.id}" — one archive would overwrite the other`,
      )
    }
    seen.set(brand.id, brand.name)
  }

  const withOverlays = brands.filter((brand) => hasOverlayFiles(brand.dir))
  if (withOverlays.length > 1) {
    throw new Error(
      `[brand-repo] several brands ship ${OVERLAY_DIRS.join('/ or ')}/ (${names(withOverlays)}) — those are compiled into the backend image, so only one brand of a repo may have them`,
    )
  }
  if (!brands.length) {
    warnings.push(`[brand-repo] ${BRANDINGS_DIR}/ holds no brand with a brand.config.* — vanilla`)
  }

  return {
    layout: 'brandings',
    brands,
    soleBrand: brands.length === 1 ? brands[0] : null,
    overlayDir: withOverlays[0]?.dir ?? null,
    warnings,
  }
}

/**
 * The brand a single-brand consumer (the maintenance dev server, `npm run brand`) shows: the one named
 * by `wanted` — its brand id or its directory name — or else the repo's sole brand. Null when nothing
 * is named and the repo holds no or several brands; a `wanted` the repo does not hold is an error.
 */
export function selectBrand(repo: BrandRepo, wanted?: string): RepoBrand | null {
  if (!wanted) {
    return repo.soleBrand
  }
  const brand =
    repo.brands.find((b) => b.id === wanted) ?? repo.brands.find((b) => b.name === wanted)
  if (!brand) {
    throw new Error(
      `[brand-repo] no brand "${wanted}" in this repo (${repo.brands.map((b) => b.id).join(', ') || 'none'})`,
    )
  }
  return brand
}

/** Copy the repo's overlay folder (see BrandRepo.overlayDir) to `target`. False when there is none. */
export function copyOverlays(repo: BrandRepo, target: string): boolean {
  if (!repo.overlayDir) {
    return false
  }
  for (const sub of OVERLAY_DIRS) {
    const from = join(repo.overlayDir, sub)
    if (isDir(from)) {
      cpSync(from, join(target, sub), { recursive: true })
    }
  }
  return true
}
