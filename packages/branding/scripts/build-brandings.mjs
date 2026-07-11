#!/usr/bin/env node
// Multi-brand build (CLI): bake N brands into ONE served folder, collision-free.
//
//   node scripts/build-brandings.mjs <out-dir> <brand-dir> [<brand-dir> ...]
//
// Each brand directory holds brand.config.(ts|mjs), assets/, html/ and an optional package.json
// with a "brandId". The <out-dir> is served at /branding/* (dev: serverMiddleware from
// $OCELOT_BRANDING_ASSETS_DIR; prod: a mounted volume). See lib/build-brandings.mjs for the core,
// and build-dev-brandings.mjs to auto-discover every compatible brand under deployment/.
import { buildBrandings } from './lib/build-brandings.mjs'

const [outArg, ...brandArgs] = process.argv.slice(2)
if (!outArg || brandArgs.length === 0) {
  console.error('usage: build-brandings.mjs <out-dir> <brand-dir> [<brand-dir> ...]')
  process.exit(1)
}

await buildBrandings(outArg, brandArgs)
