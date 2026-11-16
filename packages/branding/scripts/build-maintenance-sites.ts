// Generate the maintenance page of every brand in a brand repo — see lib/maintenance-sites.ts.
//
//   node scripts/build-maintenance-sites.ts <repo> <maintenance-dir>
//
// Runs `npx nuxt generate` in <maintenance-dir> once (no or one brand) or once per brand plus once
// vanilla (several brands). A vanilla repo just generates the vanilla page.
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveBrandRepo } from './lib/brand-repo.ts'
import { SITES_DIR, buildMaintenanceSites } from './lib/maintenance-sites.ts'

import type { BrandRepo } from './lib/brand-repo.ts'

const [repoArg, maintenanceArg] = process.argv.slice(2)
if (!repoArg || !maintenanceArg) {
  console.error('usage: build-maintenance-sites.ts <repo> <maintenance-dir>')
  process.exit(1)
}
const maintenanceDir = resolve(maintenanceArg)
const generator = fileURLToPath(new URL('./build-maintenance-branding.ts', import.meta.url))
const { paths: GENERATED } = JSON.parse(
  readFileSync(new URL('./maintenance-generated-paths.json', import.meta.url), 'utf8'),
) as { paths: string[] }

let repo: BrandRepo
try {
  repo = resolveBrandRepo(repoArg)
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}
for (const warning of repo.warnings) {
  console.error(warning)
}

const run = (command: string, args: string[]): void => {
  execFileSync(command, args, { cwd: maintenanceDir, stdio: 'inherit' })
}
const { root, sites } = buildMaintenanceSites(repo, maintenanceDir, {
  brand: (brandDir) => {
    run(process.execPath, [generator, brandDir, maintenanceDir])
  },
  unbrand: () => {
    for (const rel of GENERATED) {
      rmSync(join(maintenanceDir, rel), { recursive: true, force: true })
    }
  },
  generate: () => {
    run('npx', ['nuxt', 'generate'])
  },
})

console.log(`[maintenance] root page: ${root ?? 'vanilla ocelot.social'}`)
if (sites.length) {
  console.log(
    `[maintenance] one page per brand under ${SITES_DIR}/: ${sites.join(', ')} — the container serves the one $OCELOT_ACTIVE_BRANDING names`,
  )
}
