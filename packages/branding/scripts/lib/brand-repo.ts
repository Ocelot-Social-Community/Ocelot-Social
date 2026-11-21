// Resolve a BRAND REPO — the build context of a downstream brand build (`FROM backend-build` / `FROM
// webapp-build` / `FROM maintenance-build`), or a config dir under deployment/configurations/<name> —
// into the brands it holds and the backend overlays it ships.
//
//   brandings/<name>/   one directory per brand; a repo may hold several. Each one with a brand.config.*
//                       becomes its own archive, so the live network can switch between them
//                       (activeBranding) or compose them per bucket (brandingComposition).
//   overlays/           code and seed data compiled into the BACKEND image, independent of any brand:
//                       middlewares/ → src/middleware/branding/, data/ → src/db/data/.
//
// The former single-brand layout, branding/, is no longer read: a repo that still has it fails with
// the migration steps instead of building something else than its author expects.
//
// There is no build-time "default brand". Which brand a network renders is deployment configuration —
// the activeBranding policy, else $OCELOT_ACTIVE_BRANDING — so one set of images serves every brand of
// the repo. The one exception is a repo with a SOLE brand: that one is marked as the image's fallback,
// so a single-brand deployment needs no configuration at all. The static maintenance page, which
// cannot ask at runtime, gets one page per brand (see maintenance-sites.ts).
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { archiveFileNames, brandId, brandVersion, findConfig } from './build-brandings.ts'

export const LEGACY_DIR = 'branding'
export const BRANDINGS_DIR = 'brandings'
export const OVERLAYS_DIR = 'overlays'
/** The env var a deployment names its brand with; read by the backend, the webapp and the maintenance page. */
export const ACTIVE_BRANDING_ENV = 'OCELOT_ACTIVE_BRANDING'
/** What overlays/ may hold: code and seed data compiled into the backend image. */
export const OVERLAY_DIRS = ['middlewares', 'data']

export interface RepoBrand {
  /** Directory name under brandings/. */
  name: string
  dir: string
  id: string
}

export interface BrandRepo {
  /** Every brand with a brand.config.*, sorted by directory name. */
  brands: RepoBrand[]
  /** The repo's only brand, or null when it holds none or several — the image's fallback brand. */
  soleBrand: RepoBrand | null
  /** The repo's overlays/ when it ships any middlewares/ or data/, else null. */
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

const moveOverlays = `move its ${OVERLAY_DIRS.join('/ and ')}/ to ${OVERLAYS_DIR}/`

export function resolveBrandRepo(root: string): BrandRepo {
  const repo = resolve(root)
  const multiDir = join(repo, BRANDINGS_DIR)
  const overlaysDir = join(repo, OVERLAYS_DIR)
  const warnings: string[] = []

  if (hasContent(join(repo, LEGACY_DIR))) {
    throw new Error(
      `[brand-repo] ${LEGACY_DIR}/ is no longer supported — ${moveOverlays} (if any), then move ${LEGACY_DIR}/ to ${BRANDINGS_DIR}/<name>/`,
    )
  }

  const brands: RepoBrand[] = []
  const misplaced: string[] = []
  const names = hasContent(multiDir) ? readdirSync(multiDir).sort() : []
  for (const name of names) {
    const dir = join(multiDir, name)
    if (!isDir(dir)) {
      continue
    }
    // Overlays inside a brand would be compiled in whichever brand is active — they are the repo's,
    // not the brand's. Failing here also catches a migrated branding/ that kept them.
    if (hasOverlayFiles(dir)) {
      misplaced.push(name)
    }
    if (findConfig(dir)) {
      brands.push({ name, dir, id: brandId(dir) })
    } else if (existsSync(join(dir, 'brand.config.js'))) {
      // Skipping it would build the repo without this brand — and could make another one the sole,
      // default brand. A config the author wrote is never silently dropped.
      throw new Error(
        `[brand-repo] ${BRANDINGS_DIR}/${name}/brand.config.js is not read any more — rename it to brand.config.mjs (plain ESM) or port it to brand.config.ts`,
      )
    } else {
      warnings.push(`[brand-repo] ${BRANDINGS_DIR}/${name}/ has no brand.config.(ts|mjs) — skipped`)
    }
  }
  if (misplaced.length) {
    throw new Error(
      `[brand-repo] ${misplaced.map((n) => `${BRANDINGS_DIR}/${n}/`).join(', ')} ship ${OVERLAY_DIRS.join('/ or ')}/ — those belong to the repo, not to a brand: ${moveOverlays}`,
    )
  }

  // The brands are baked one after the other into one directory, and a later archive overwrites an
  // earlier one of the same name without a word — so every file name a brand will write is checked,
  // not just its id: `acme` at 1.0.0 writes acme-1.0.0.tar.gz, which is the latest archive of a
  // brand with the id `acme-1.0.0`. Equal ids collide on their latest name, so they are caught too.
  const writtenBy = new Map<string, RepoBrand>()
  for (const brand of brands) {
    const { latest, versioned } = archiveFileNames(brand.id, brandVersion(brand.dir))
    for (const file of [latest, versioned]) {
      if (!file) {
        continue
      }
      const other = writtenBy.get(file)
      if (other) {
        const why =
          other.id === brand.id
            ? `share the brand id "${brand.id}"`
            : `would both write ${file} (brand ids "${other.id}" and "${brand.id}")`
        throw new Error(
          `[brand-repo] ${BRANDINGS_DIR}/${other.name}/ and ${BRANDINGS_DIR}/${brand.name}/ ${why} — one archive would overwrite the other`,
        )
      }
      writtenBy.set(file, brand)
    }
  }
  if (names.length && !brands.length) {
    warnings.push(`[brand-repo] ${BRANDINGS_DIR}/ holds no brand with a brand.config — vanilla`)
  }

  if (hasContent(overlaysDir)) {
    for (const entry of readdirSync(overlaysDir).sort()) {
      if (!OVERLAY_DIRS.includes(entry) && entry !== '.gitkeep') {
        warnings.push(
          `[brand-repo] ${OVERLAYS_DIR}/${entry} is not one of ${OVERLAY_DIRS.map((d) => `${d}/`).join(', ')} — ignored`,
        )
      }
    }
  }

  return {
    brands,
    soleBrand: brands.length === 1 ? brands[0] : null,
    overlayDir: hasOverlayFiles(overlaysDir) ? overlaysDir : null,
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

/** Copy the repo's overlays (see BrandRepo.overlayDir) to `target`. False when there are none. */
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
