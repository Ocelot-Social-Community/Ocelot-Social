#!/usr/bin/env node
// Dev auto-load: discover every COMPATIBLE branding under deployment/configurations/* and bake them
// all into one served folder for the developer, so `yarn dev` can offer them on /admin/branding.
//
//   node scripts/build-dev-brandings.mjs [out-dir]
//
// "Compatible" = the config dir has a brand.config.(ts|mjs|js) (the new typed format). Old-format
// deployment configs (constants/*.js only) are skipped and listed, so it's obvious what was left
// out. Output defaults to <repo>/.branding-dev (gitignored); point the webapp at it with
//   OCELOT_BRANDING_ASSETS_DIR=<out-dir>/branding
// (webapp/.env; relative ../.branding-dev/branding works because `yarn dev` runs in webapp/).
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildBrandings, findConfig } from './lib/build-brandings.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
// packages/branding/scripts → repo root
const repoRoot = resolve(scriptDir, '../../..')
const configurationsRoot = join(repoRoot, 'deployment', 'configurations')
const outDir = process.argv[2] ? resolve(process.argv[2]) : join(repoRoot, '.branding-dev')

if (!existsSync(configurationsRoot)) {
  console.error(`no deployment/configurations at ${configurationsRoot}`)
  process.exit(1)
}

const compatible = []
const skipped = []
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
  // eslint-disable-next-line no-console
  console.log(`[dev-brandings] skipped (no brand.config.*): ${skipped.join(', ')}`)
}
if (!compatible.length) {
  console.error('[dev-brandings] no compatible brandings found — nothing to build')
  process.exit(1)
}

await buildBrandings(outDir, compatible)
// eslint-disable-next-line no-console
console.log(`[dev-brandings] set OCELOT_BRANDING_ASSETS_DIR=${join(outDir, 'branding')}`)
