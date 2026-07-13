// Dev auto-load: discover every COMPATIBLE branding under deployment/configurations/* and PUBLISH each
// into its own `dist/<id>.tar.gz` (same as the brand's own `npm run build`), so `yarn dev` serves them
// straight from deployment/configurations — no separate aggregate folder.
//
//   node scripts/build-dev-brandings.mjs
//
// "Compatible" = the config dir has a brand.config.(ts|mjs|js) (the new typed format). Old-format
// deployment configs (constants/*.js only) are skipped and listed, so it's obvious what was left out.
// Point the apps at the configurations root; archives are found RECURSIVELY (see src/discover.ts):
//   OCELOT_BRANDING_ASSETS_DIR=../deployment/configurations   (webapp/.env; relative to webapp/)
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { findConfig, publishBrandArchive } from './lib/build-brandings.mts'

const scriptDir = dirname(fileURLToPath(import.meta.url))
// packages/branding/scripts → repo root
const repoRoot = resolve(scriptDir, '../../..')
const configurationsRoot = join(repoRoot, 'deployment', 'configurations')

if (!existsSync(configurationsRoot)) {
  console.error(`no deployment/configurations at ${configurationsRoot}`)
  process.exit(1)
}

const compatible: string[] = []
const skipped: string[] = []
for (const entry of readdirSync(configurationsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const brandDir = join(configurationsRoot, entry.name, 'branding')
  if (existsSync(brandDir) && findConfig(brandDir)) {
    compatible.push(brandDir)
  } else {
    skipped.push(entry.name)
  }
}

if (skipped.length) {
  console.log(`[dev-brandings] skipped (no brand.config.*): ${skipped.join(', ')}`)
}
if (!compatible.length) {
  console.error('[dev-brandings] no compatible brandings found — nothing to build')
  process.exit(1)
}

for (const brandDir of compatible) {
  const { id, version, dir, versioned } = await publishBrandArchive(brandDir)

  console.log(
    `[dev-brandings] ${id}${version ? ` v${version}` : ''} → ${dir}${versioned ? ' (+versioned)' : ''}`,
  )
}

console.log(
  `[dev-brandings] ${compatible.length} brand(s) built. set OCELOT_BRANDING_ASSETS_DIR=${configurationsRoot} (archives found recursively)`,
)
