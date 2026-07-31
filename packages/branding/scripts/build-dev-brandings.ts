// Dev auto-load: discover every COMPATIBLE branding under deployment/configurations/* and PUBLISH each
// into its own `dist/<id>.tar.gz` (same as the brand's own `npm run build`), so `yarn dev` serves them
// straight from deployment/configurations — no separate aggregate folder.
//
//   node scripts/build-dev-brandings.ts
//
// "Compatible" = the config dir has a brand.config.(ts|mjs|js) (the new typed format). Old-format
// deployment configs (constants/*.js only) are skipped and listed, so it's obvious what was left out.
//
// NOTHING has to be configured to pick the results up: `../deployment/configurations` is one of the
// conventional locations both apps search by default (src/discover.ts DEFAULT_ROOTS), and archives are
// found RECURSIVELY under it, so each brand's own `dist/` is enough.
//
// How a rebuild reaches the two apps differs, and only one of them is ordered by that search path:
//   • BACKEND — reads the tree directly (searchPath, no cache), so a rebuilt archive is served on the
//     next request. This is the one where $OCELOT_BRANDING_ASSETS_DIR decides precedence.
//   • WEBAPP  — mirrors the backend into its own cache, and that cache is ALWAYS searched first
//     (cacheFirstSearchPath); it is not part of the configurable path. Appending the cache to
//     $OCELOT_BRANDING_ASSETS_DIR therefore changes nothing, and putting this tree first does NOT
//     make a local build out-rank the sync. The rebuild still arrives — via the backend, within
//     $OCELOT_BRANDING_SYNC_TTL_MS (60s; set it to 0 to see every change on the next refresh).
//
// What DOES matter: never point $OCELOT_BRANDING_CACHE_DIR at this tree. The sync owns that directory
// and deletes in it; aimed here it would compete with your brand builds. Its default (`.branding-cache`
// next to the app) is already clear of them.
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { findConfig, publishBrandArchive } from './lib/build-brandings.ts'

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
  `[dev-brandings] ${compatible.length} brand(s) built into their dist/ under ${configurationsRoot} — ` +
    `both apps search there by default, no env needed (the webapp picks a rebuild up from the backend ` +
    `within OCELOT_BRANDING_SYNC_TTL_MS, 60s by default)`,
)
