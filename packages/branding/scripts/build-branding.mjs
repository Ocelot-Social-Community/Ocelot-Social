#!/usr/bin/env node
// Dev helper + CI gate: resolve a SINGLE brand config to the JSON artifact that OCELOT_BRANDING_PATH
// points at.
//
//   node scripts/build-branding.mjs <brand.config.(ts|mjs|js)> <out.json> [--watch]
//
// A `.ts` config is TYPE-CHECKED against the branding schema (BrandingOverrides) before it is
// evaluated — a wrong key or type FAILS the build (exit 1). See lib/load-config.mjs.
//
// With --watch the JSON is regenerated whenever the config changes; the webapp reads the JSON per
// SSR request, so a browser refresh (F5) shows the change — no Docker, no rebuild. See
// docu/branding-architecture-konzept.md (developer mode). For MULTIPLE brands baked into one served
// folder (namespaced, collision-free) use build-brandings.mjs instead.
import { watch, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { loadConfig } from './lib/load-config.mjs'

const [configArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const isWatch = process.argv.includes('--watch')

if (!configArg || !outArg) {
  console.error('usage: build-branding.mjs <brand.config.(ts|mjs|js)> <out.json> [--watch]')
  process.exit(1)
}

const configPath = resolve(configArg)
const outPath = resolve(outArg)

async function build() {
  const config = await loadConfig(configPath)
  writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`)
  // eslint-disable-next-line no-console
  console.log(`[branding] ${configArg} → ${outArg}`)
}

await build()

if (isWatch) {
  // eslint-disable-next-line no-console
  console.log('[branding] watching for changes…')
  watch(configPath, () => {
    build().catch((error) => console.error('[branding] build failed:', error.message))
  })
}
