// Bake a BRAND REPO into an image: every brand it holds as an archive, plus the parts a single image
// can only hold once. Rules on layouts: lib/brand-repo.ts.
//
//   node scripts/bake-brand-repo.ts <repo> [--archives <dir>] [--overlays-to <dir>]
//                                          [--brand-to <dir> [--select <id>]]
//
//   --archives <dir>     publish every brand into <dir> (`<id>.tar.gz` + versioned); a SOLE brand also
//                        gets the DEFAULT marker, so a single-brand image needs no configuration
//   --overlays-to <dir>  copy the backend overlays (middlewares/, data/) of the one brand that ships
//                        them to <dir>; left absent when none does
//   --brand-to <dir>     copy ONE brand's directory to <dir>: the one --select names (brand id or
//                        directory name; the Dockerfiles pass $OCELOT_ACTIVE_BRANDING), else the sole
//                        brand; left absent when that is ambiguous. An unknown --select fails.
//
// No brand at all is not an error: the image stays vanilla, as before.
import { cpSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  ACTIVE_BRANDING_ENV,
  copyOverlays,
  resolveBrandRepo,
  selectBrand,
} from './lib/brand-repo.ts'
import { publishBrandArchive } from './lib/build-brandings.ts'

import type { BrandRepo, RepoBrand } from './lib/brand-repo.ts'

function option(name: string): string | undefined {
  const at = process.argv.indexOf(name)
  return at === -1 ? undefined : process.argv[at + 1]
}

const repoArg = process.argv[2]
if (!repoArg || repoArg.startsWith('--')) {
  console.error(
    'usage: bake-brand-repo.ts <repo> [--archives <dir>] [--overlays-to <dir>] [--brand-to <dir> [--select <id>]]',
  )
  process.exit(1)
}
const archivesDir = option('--archives')
const overlaysTo = option('--overlays-to')
const brandTo = option('--brand-to')
const wanted = option('--select')

// A layout error is the brand author's to fix: print the rule that was broken, not a stack trace.
let repo: BrandRepo
let selected: RepoBrand | null = null
try {
  repo = resolveBrandRepo(repoArg)
  if (brandTo) {
    selected = selectBrand(repo, wanted)
  }
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}
for (const warning of repo.warnings) {
  console.error(warning)
}

if (archivesDir) {
  for (const brand of repo.brands) {
    const isDefault = brand === repo.soleBrand
    const { id, version, warnings } = await publishBrandArchive(brand.dir, {
      outDir: archivesDir,
      markDefault: isDefault,
    })
    for (const warning of warnings) {
      console.error(warning)
    }
    console.log(
      `[branding] baked ${id}${version ? ` v${version}` : ''}${isDefault ? ' (default)' : ''} → ${resolve(archivesDir)}`,
    )
  }
  if (repo.brands.length > 1) {
    console.log(
      `[branding] ${repo.brands.length} brands, none of them a default: name one with ${ACTIVE_BRANDING_ENV}=<id> in the deployment, or pick it in the admin — until then the network renders unbranded`,
    )
  }
}

if (overlaysTo && copyOverlays(repo, resolve(overlaysTo))) {
  console.log(`[branding] backend overlays from ${repo.overlayDir} → ${resolve(overlaysTo)}`)
}

if (brandTo) {
  if (selected) {
    cpSync(selected.dir, resolve(brandTo), { recursive: true })
    console.log(`[branding] brand ${selected.id} → ${resolve(brandTo)}`)
  } else if (repo.brands.length > 1) {
    console.log(
      `[branding] several brands (${repo.brands.map((b) => b.id).join(', ')}) — pass --select <id> (${ACTIVE_BRANDING_ENV}) to pick one; none copied`,
    )
  }
}

if (!repo.brands.length) {
  console.log('[branding] no typed brand.config — vanilla ocelot.social')
}
