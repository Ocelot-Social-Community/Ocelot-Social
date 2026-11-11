// The per-brand maintenance pages (scripts/lib/maintenance-sites.ts): which pages are generated, in
// which order, and where each one lands. The steps are fakes that record what they were asked and
// write a page naming the brand that was active when it was "generated".
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'

import { SITES_DIR, buildMaintenanceSites } from './maintenance-sites.ts'

import type { BrandRepo, RepoBrand } from './brand-repo.ts'

const roots: string[] = []
after(() => {
  for (const dir of roots) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const brandOf = (id: string): RepoBrand => ({ name: id, dir: `/repo/brandings/${id}`, id })
const repoOf = (...ids: string[]): BrandRepo => {
  const brands = ids.map(brandOf)
  return {
    layout: ids.length ? 'brandings' : 'none',
    brands,
    soleBrand: brands.length === 1 ? brands[0] : null,
    overlayDir: null,
    warnings: [],
  }
}

function fakeApp(extraFiles: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-maintenance-'))
  roots.push(dir)
  const calls: string[] = []
  let active = 'vanilla'
  const output = join(dir, '.output', 'public')
  return {
    dir,
    calls,
    output,
    steps: {
      brand: (brandDir: string) => {
        active = brandDir.split('/').pop() as string
        calls.push(`brand ${active}`)
      },
      unbrand: () => {
        active = 'vanilla'
        calls.push('unbrand')
      },
      generate: () => {
        calls.push('generate')
        // Like nuxt: the output directory is replaced on every run.
        rmSync(output, { recursive: true, force: true })
        mkdirSync(output, { recursive: true })
        writeFileSync(join(output, 'index.html'), active)
        for (const rel of extraFiles) {
          mkdirSync(join(output, rel), { recursive: true })
        }
      },
    },
  }
}

const page = (path: string): string => readFileSync(join(path, 'index.html'), 'utf8')

describe('buildMaintenanceSites', () => {
  test('a vanilla repo generates the vanilla page once', () => {
    const app = fakeApp()
    assert.deepEqual(buildMaintenanceSites(repoOf(), app.dir, app.steps), { root: null, sites: [] })
    assert.deepEqual(app.calls, ['generate'])
    assert.equal(page(app.output), 'vanilla')
  })

  test('a sole brand is the root page, with no per-brand folder', () => {
    const app = fakeApp()
    assert.deepEqual(buildMaintenanceSites(repoOf('acme'), app.dir, app.steps), {
      root: 'acme',
      sites: [],
    })
    assert.deepEqual(app.calls, ['brand acme', 'generate'])
    assert.equal(page(app.output), 'acme')
    assert.equal(existsSync(join(app.output, SITES_DIR)), false)
  })

  test('several brands: one page each under _brands/, a vanilla root, generated in that order', () => {
    const app = fakeApp()
    assert.deepEqual(buildMaintenanceSites(repoOf('classic', 'new'), app.dir, app.steps), {
      root: null,
      sites: ['classic', 'new'],
    })
    assert.deepEqual(app.calls, [
      'brand classic',
      'generate',
      'brand new',
      'generate',
      'unbrand',
      'generate',
    ])
    assert.equal(page(app.output), 'vanilla')
    assert.equal(page(join(app.output, SITES_DIR, 'classic')), 'classic')
    assert.equal(page(join(app.output, SITES_DIR, 'new')), 'new')
    assert.equal(existsSync(join(app.dir, '.brand-sites')), false)
  })

  test('a leftover staging folder from an aborted run does not leak into the result', () => {
    const app = fakeApp()
    mkdirSync(join(app.dir, '.brand-sites', 'stale'), { recursive: true })
    buildMaintenanceSites(repoOf('a', 'b'), app.dir, app.steps)
    assert.equal(existsSync(join(app.output, SITES_DIR, 'stale')), false)
  })

  test('a vanilla page that already holds _brands/ fails instead of mixing the two', () => {
    const app = fakeApp([SITES_DIR])
    assert.throws(
      () => buildMaintenanceSites(repoOf('a', 'b'), app.dir, app.steps),
      /already holds _brands\//,
    )
  })
})
