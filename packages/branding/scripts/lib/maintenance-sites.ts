// Generate the static maintenance page for EVERY brand of a brand repo.
//
// The page is served by nginx precisely when the backend is down, so it cannot ask which brand is
// active — it is generated ahead of time. With one brand that is simply that brand's page. With several
// there is no build-time answer (the network names its brand at runtime, $OCELOT_ACTIVE_BRANDING), so
// each brand gets its own complete page and the container picks one when it starts
// (maintenance/nginx/30-active-branding.sh):
//
//   .output/public/                    the page served when nothing is named: the sole brand, or
//                                      vanilla when the repo holds several
//   .output/public/_brands/<id>/       one complete page per brand — only when there are several
//
// Each page is a full `nuxt generate` of its own: the generator writes the brand INTO the app sources
// and nuxt.config decides at build time which overlays exist, so pages cannot share one build. Absolute
// asset paths (/_nuxt/…, /brand/…) stay right, because the selected folder becomes nginx's root.
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import type { BrandRepo } from './brand-repo.ts'

/** The folder under the generated page that holds one page per brand. */
export const SITES_DIR = '_brands'

/** What generating a page takes; injected so the orchestration is testable without nuxt. */
export interface MaintenanceSteps {
  /** Write a brand into the app sources (build-maintenance-branding.ts). */
  brand: (brandDir: string) => void
  /** Remove every generated brand file, back to the vanilla sources. */
  unbrand: () => void
  /** `nuxt generate` → `<maintenanceDir>/.output/public`. */
  generate: () => void
}

export interface MaintenanceSites {
  /** Brand id of the page at the root, null for vanilla. */
  root: string | null
  /** Brand ids with their own page under SITES_DIR. */
  sites: string[]
}

export function buildMaintenanceSites(
  repo: BrandRepo,
  maintenanceDir: string,
  steps: MaintenanceSteps,
): MaintenanceSites {
  const output = join(maintenanceDir, '.output', 'public')

  if (repo.brands.length < 2) {
    if (repo.soleBrand) {
      steps.brand(repo.soleBrand.dir)
    }
    steps.generate()
    return { root: repo.soleBrand?.id ?? null, sites: [] }
  }

  // Outside .output: `nuxt generate` empties that directory on every run.
  const staging = join(maintenanceDir, '.brand-sites')
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  for (const brand of repo.brands) {
    steps.brand(brand.dir)
    steps.generate()
    renameSync(output, join(staging, brand.id))
  }
  steps.unbrand()
  steps.generate()
  if (existsSync(join(output, SITES_DIR))) {
    throw new Error(
      `[maintenance] the vanilla page already holds ${SITES_DIR}/ — a public/${SITES_DIR}/ would collide with the per-brand pages`,
    )
  }
  renameSync(staging, join(output, SITES_DIR))
  return { root: null, sites: repo.brands.map((b) => b.id) }
}
