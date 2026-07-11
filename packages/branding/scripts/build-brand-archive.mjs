#!/usr/bin/env node
// Build ONE brand into its `<id>.tar.gz` archive — the distributable artifact every consumer reads
// from (webapp serverMiddleware, branding plugin, maintenance). A brand's own `npm run build` runs
// this (see the brand package.json).
//
//   node scripts/build-brand-archive.mjs <brand-dir> [out.tar.gz]
//
// The archive bundles the resolved (namespaced) branding.json + assets/ + html/. Default output is
// `<id>.tar.gz` in the current directory.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildBrandArchive } from './lib/build-brandings.mjs'

const [brandArg, outArg] = process.argv.slice(2)
if (!brandArg) {
  console.error('usage: build-brand-archive.mjs <brand-dir> [out.tar.gz]')
  process.exit(1)
}

const { id, gz, entries } = await buildBrandArchive(brandArg)
const out = resolve(outArg || `${id}.tar.gz`)
writeFileSync(out, gz)
// eslint-disable-next-line no-console
console.log(`[brand] ${id} → ${out} (${entries.length} files, ${gz.length} b)`)
