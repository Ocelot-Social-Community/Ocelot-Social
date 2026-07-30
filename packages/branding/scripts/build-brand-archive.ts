#!/usr/bin/env node
// Build ONE brand into its `<id>.tar.gz` archive — the distributable artifact every consumer reads
// from (webapp serverMiddleware, branding plugin, backend bootstrap, maintenance). A brand's own
// `npm run build` runs this (see the brand package.json).
//
//   node scripts/build-brand-archive.ts <brand-dir> [out] [--watch]
//
// The archive bundles the brand's bucket-instance fragments + assets/ + html/, indexed by manifest.json
// (the brand's package.json `version` is recorded as manifest.version, not in any config leaf).
//
// Output:
//   • no [out]             → publish into <brand-dir>/dist as BOTH
//                              dist/<id>-<version>.tar.gz  (immutable, versioned history)
//                              dist/<id>.tar.gz            (latest — the name every consumer mounts)
//                            (the versioned file is skipped only when package.json has no `version`)
//   • [out] a directory    → the same two files, written there
//   • [out] ending .tar.gz → that single file (used by --watch pointing straight into the served
//                            $OCELOT_BRANDING_ASSETS_DIR so the running app picks it up on F5)
//
// --default (only with a directory out): additionally writes a `DEFAULT` marker file holding the
// brand id, so an image that bakes this brand as its default theme renders branded out of the box
// (webapp plugin / backend bootstrap read the marker when no brand is pinned by policy/env).
import { watch, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import { buildBrandArchive, publishBrandArchive } from './lib/build-brandings.ts'

const rest = process.argv.slice(2)
const isWatch = rest.includes('--watch')
const isDefault = rest.includes('--default')
const [brandArg, outArg]: (string | undefined)[] = rest.filter((a) => !a.startsWith('--'))
if (!brandArg) {
  console.error('usage: build-brand-archive.ts <brand-dir> [out] [--watch] [--default]')
  process.exit(1)
}
const brandDir = resolve(brandArg)

async function build(): Promise<void> {
  // A single explicit .tar.gz target → write just that file (dev/watch into the served dir).
  if (outArg?.endsWith('.tar.gz')) {
    const { id, gz, entries } = await buildBrandArchive(brandDir)
    const out = resolve(outArg)
    writeFileSync(out, gz)

    console.log(`[brand] ${id} → ${out} (${entries.length} files, ${gz.length} b)`)
    return
  }

  // Otherwise publish into a dist directory: latest + versioned artifact (+ DEFAULT marker).
  const { id, version, entries, dir, latest, versioned } = await publishBrandArchive(brandDir, {
    outDir: outArg,
    markDefault: isDefault,
  })

  console.log(
    `[brand] ${id}${version ? ` v${version}` : ''} → ${versioned ? `${basename(versioned)} + ` : ''}${basename(latest)}${isDefault ? ' + DEFAULT' : ''} in ${dir} (${entries.length} files)`,
  )
}

await build()

if (isWatch) {
  console.log('[brand] watching for changes…')
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(brandDir, { recursive: true }, (_event, filename) => {
    // Ignore our own output (the .tar.gz files, incl. those under dist/).
    if (filename?.endsWith('.tar.gz')) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      build().catch((error: unknown) => {
        console.error('[brand] build failed:', error instanceof Error ? error.message : error)
      })
    }, 150)
  })
}
