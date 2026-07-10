#!/usr/bin/env node
// Dev helper: resolve a brand config to the JSON artifact that OCELOT_BRANDING_PATH points at.
//
//   node scripts/build-branding.mjs <brand.config.(mjs|js)> <out.json> [--watch]
//
// The brand config default-exports `defineBranding({...})` (import defineBranding from
// '@ocelot-social/branding' — run this where that package resolves, e.g. from the repo/webapp).
// With --watch the JSON is regenerated whenever the config changes; the webapp reads the JSON per
// SSR request, so a browser refresh (F5) shows the change — no Docker, no rebuild. See
// docu/branding-architecture-konzept.md (developer mode).
import { writeFileSync } from 'node:fs'
import { watch } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [configArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const isWatch = process.argv.includes('--watch')

if (!configArg || !outArg) {
  console.error('usage: build-branding.mjs <brand.config.(mjs|js)> <out.json> [--watch]')
  process.exit(1)
}

const configPath = resolve(configArg)
const outPath = resolve(outArg)

async function build() {
  // Cache-bust the import so --watch picks up edits.
  const mod = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)
  const config = mod.default ?? mod
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
