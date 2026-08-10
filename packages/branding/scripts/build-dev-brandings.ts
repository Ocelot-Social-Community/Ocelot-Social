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
// How a rebuild reaches the two apps differs. $OCELOT_BRANDING_ASSETS_DIR orders the roots in BOTH —
// what differs is whether this tree can be put in front of everything:
//   • BACKEND — reads the tree directly (searchPath, no cache), so a rebuilt archive is served on the
//     next request and the configured order decides outright.
//   • WEBAPP  — mirrors the backend into its own cache, and cacheFirstSearchPath PREPENDS that cache
//     to the configured path. The roots after it keep the order you give them; only the first slot is
//     taken. So putting this tree first does NOT make a local build out-rank the sync, and appending
//     the cache changes nothing (it is already there). The rebuild still arrives via the backend, but
//     the TTL is a CHECK INTERVAL, not a deadline: the first request once
//     $OCELOT_BRANDING_SYNC_TTL_MS (60s) has elapsed only STARTS the sync, in the background, and
//     that request still renders the old state. The change shows on a later one — so with the TTL at
//     0, refresh twice.
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
  const { id, version, dir, versioned, warnings } = await publishBrandArchive(brandDir)

  // Same reason the single-brand CLI reports them: every check in build-brandings.ts describes damage
  // the archive itself cannot show, so a swallowed warning is a fault discovered in a browser instead.
  for (const warning of warnings) console.error(warning)
  console.log(
    `[dev-brandings] ${id}${version ? ` v${version}` : ''} → ${dir}${versioned ? ' (+versioned)' : ''}`,
  )
}

console.log(
  `[dev-brandings] ${compatible.length} brand(s) built into their dist/ under ${configurationsRoot} — ` +
    `both apps search there by default, no env needed. The backend serves a rebuild at once; the ` +
    `webapp syncs it from there — the first request after OCELOT_BRANDING_SYNC_TTL_MS (60s) starts ` +
    `that sync in the background, so the change appears on a later request`,
)
