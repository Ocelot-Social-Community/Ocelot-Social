// Brand-repo resolution (scripts/lib/brand-repo.ts) and the bake CLI built on it
// (scripts/bake-brand-repo.ts): which layout a repo has, which brands it holds, which one an image
// falls back to, and what an image takes from where. Runs against real temp repos with `.mjs` configs.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { copyOverlays, resolveBrandRepo, selectBrand } from './brand-repo.ts'

const roots: string[] = []
after(() => {
  for (const dir of roots) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const CONFIG = "export default (d) => d({ metadata: { applicationName: 'X' } })\n"

// A temp repo holding `files` (path → content) verbatim.
function repo(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-brand-repo-'))
  roots.push(dir)
  for (const [rel, body] of Object.entries(files)) {
    const p = join(dir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body)
  }
  return dir
}

const brand = (path: string, id: string): Record<string, string> => ({
  [`${path}/brand.config.mjs`]: CONFIG,
  [`${path}/package.json`]: JSON.stringify({
    name: `${id}-branding`,
    brandId: id,
    version: '1.0.0',
  }),
})

describe('resolveBrandRepo', () => {
  test('an empty repo is vanilla, without warnings', () => {
    const r = resolveBrandRepo(repo())
    assert.equal(r.layout, 'none')
    assert.deepEqual(r.brands, [])
    assert.equal(r.soleBrand, null)
    assert.equal(r.overlayDir, null)
    assert.deepEqual(r.warnings, [])
  })

  test('empty branding/ and brandings/ (what ONBUILD COPY leaves behind) count as absent', () => {
    const root = repo()
    mkdirSync(join(root, 'branding'))
    mkdirSync(join(root, 'brandings'))
    assert.equal(resolveBrandRepo(root).layout, 'none')
  })

  test('a legacy branding/ is the sole brand and the overlay folder, with a deprecation warning', () => {
    const root = repo(brand('branding', 'acme'))
    const r = resolveBrandRepo(root)
    assert.equal(r.layout, 'legacy')
    assert.deepEqual(r.brands, [{ name: 'branding', dir: join(root, 'branding'), id: 'acme' }])
    assert.equal(r.soleBrand, r.brands[0])
    assert.equal(r.overlayDir, join(root, 'branding'))
    assert.match(r.warnings[0], /branding\/ is deprecated/)
  })

  test('a legacy branding/ without brand.config still provides the backend overlays', () => {
    const root = repo({ 'branding/middlewares/x.ts': '' })
    const r = resolveBrandRepo(root)
    assert.equal(r.layout, 'legacy')
    assert.deepEqual(r.brands, [])
    assert.equal(r.soleBrand, null)
    assert.equal(r.overlayDir, join(root, 'branding'))
  })

  test('branding/ and brandings/ together is an error', () => {
    const root = repo({ ...brand('branding', 'a'), ...brand('brandings/b', 'b') })
    assert.throws(() => resolveBrandRepo(root), /both branding\/ and brandings\//)
  })

  test('a single brand in brandings/ is the sole brand', () => {
    const root = repo(brand('brandings/acme', 'acme'))
    const r = resolveBrandRepo(root)
    assert.equal(r.layout, 'brandings')
    assert.equal(r.soleBrand?.name, 'acme')
    assert.equal(r.overlayDir, null)
    assert.deepEqual(r.warnings, [])
  })

  test('several brands: all are listed (sorted), none is a sole brand, nothing has to be chosen', () => {
    const root = repo({
      ...brand('brandings/new', 'new-id'),
      ...brand('brandings/classic', 'classic-id'),
    })
    const r = resolveBrandRepo(root)
    assert.deepEqual(
      r.brands.map((b) => [b.name, b.id]),
      [
        ['classic', 'classic-id'],
        ['new', 'new-id'],
      ],
    )
    assert.equal(r.soleBrand, null)
    assert.deepEqual(r.warnings, [])
  })

  test('files next to the brand folders are ignored', () => {
    const root = repo({ ...brand('brandings/a', 'a'), 'brandings/README.md': '' })
    assert.equal(resolveBrandRepo(root).soleBrand?.name, 'a')
  })

  test('two brands with the same id fail', () => {
    const root = repo({ ...brand('brandings/a', 'same'), ...brand('brandings/b', 'same') })
    assert.throws(() => resolveBrandRepo(root), /share the brand id "same"/)
  })

  test('a directory without brand.config is skipped with a warning; no brand at all is vanilla', () => {
    const root = repo({ 'brandings/draft/README.md': '' })
    const r = resolveBrandRepo(root)
    assert.equal(r.layout, 'brandings')
    assert.deepEqual(r.brands, [])
    assert.equal(r.soleBrand, null)
    assert.equal(r.overlayDir, null)
    assert.match(r.warnings[0], /brandings\/draft\/ has no brand.config/)
    assert.match(r.warnings[1], /holds no brand/)
  })

  test('the one brand shipping overlays provides them, whichever it is; a lone .gitkeep is none', () => {
    const root = repo({
      ...brand('brandings/main', 'main'),
      ...brand('brandings/side', 'side'),
      'brandings/main/middlewares/.gitkeep': '',
      'brandings/side/data/seed.ts': '',
    })
    assert.equal(resolveBrandRepo(root).overlayDir, join(root, 'brandings/side'))
  })

  test('two brands shipping overlays fail: the image can compile in only one', () => {
    const root = repo({
      ...brand('brandings/a', 'a'),
      ...brand('brandings/b', 'b'),
      'brandings/a/middlewares/m.ts': '',
      'brandings/b/data/d.ts': '',
    })
    assert.throws(
      () => resolveBrandRepo(root),
      /several brands ship middlewares\/ or data\/ \(a, b\)/,
    )
  })
})

describe('selectBrand', () => {
  const several = (): string =>
    repo({ ...brand('brandings/new', 'new-id'), ...brand('brandings/classic', 'classic-id') })

  test('picks a brand by id or by directory name', () => {
    const r = resolveBrandRepo(several())
    assert.equal(selectBrand(r, 'new-id')?.name, 'new')
    assert.equal(selectBrand(r, 'classic')?.id, 'classic-id')
  })

  test('without a name: the sole brand, or null when there are several', () => {
    assert.equal(selectBrand(resolveBrandRepo(repo(brand('brandings/a', 'a'))))?.id, 'a')
    assert.equal(selectBrand(resolveBrandRepo(several()), ''), null)
  })

  test('an unknown name fails and lists the brand ids', () => {
    assert.throws(
      () => selectBrand(resolveBrandRepo(several()), 'nope'),
      /"nope".*\(classic-id, new-id\)/,
    )
    assert.throws(() => selectBrand(resolveBrandRepo(repo()), 'x'), /\(none\)/)
  })
})

describe('copyOverlays', () => {
  test('copies the overlay folders of the brand that ships them, nothing else', () => {
    const root = repo({ ...brand('brandings/acme', 'acme'), 'brandings/acme/data/d.ts': 'x' })
    const target = join(repo(), 'brand')
    assert.equal(copyOverlays(resolveBrandRepo(root), target), true)
    assert.equal(readFileSync(join(target, 'data/d.ts'), 'utf8'), 'x')
    assert.equal(existsSync(join(target, 'middlewares')), false)
    assert.equal(existsSync(join(target, 'brand.config.mjs')), false)
  })

  test('copies nothing when no brand ships overlays', () => {
    const target = join(repo(), 'brand')
    assert.equal(copyOverlays(resolveBrandRepo(repo(brand('brandings/a', 'a'))), target), false)
    assert.equal(existsSync(target), false)
  })
})

describe('bake-brand-repo CLI', () => {
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'bake-brand-repo.ts')
  const run = (args: string[]): string =>
    execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', stdio: 'pipe' })
  const several = (): string =>
    repo({ ...brand('brandings/new', 'new-id'), ...brand('brandings/classic', 'classic-id') })

  test('bakes every brand of a multi-brand repo, marks none and says how to name one', () => {
    const out = join(repo(), 'out')
    const log = run([several(), '--archives', out])
    for (const file of ['new-id.tar.gz', 'new-id-1.0.0.tar.gz', 'classic-id.tar.gz']) {
      assert.ok(existsSync(join(out, file)), file)
    }
    assert.equal(existsSync(join(out, 'DEFAULT')), false)
    assert.match(log, /baked classic-id v1.0.0 →/)
    assert.doesNotMatch(log, /\(default\)/)
    assert.match(log, /2 brands, none of them a default: .*OCELOT_ACTIVE_BRANDING=<id>/)
  })

  test('a sole brand is marked as the default', () => {
    const out = join(repo(), 'out')
    const log = run([repo(brand('brandings/acme', 'acme')), '--archives', out])
    assert.equal(readFileSync(join(out, 'DEFAULT'), 'utf8').trim(), 'acme')
    assert.match(log, /baked acme v1.0.0 \(default\)/)
  })

  test('copies the overlays to --overlays-to', () => {
    const root = repo({ ...brand('brandings/acme', 'acme'), 'brandings/acme/data/d.ts': 'x' })
    const target = join(repo(), 'brand')
    assert.match(run([root, '--overlays-to', target]), /backend overlays from/)
    assert.ok(existsSync(join(target, 'data/d.ts')))
  })

  test('--brand-to copies the --select-ed brand, or the sole one', () => {
    const target = join(repo(), 'one')
    assert.match(run([several(), '--brand-to', target, '--select', 'new-id']), /brand new-id →/)
    assert.ok(existsSync(join(target, 'brand.config.mjs')))
    const sole = join(repo(), 'sole')
    run([repo(brand('brandings/acme', 'acme')), '--brand-to', sole])
    assert.ok(existsSync(join(sole, 'brand.config.mjs')))
  })

  test('--brand-to without --select copies nothing from several brands and says so', () => {
    const target = join(repo(), 'one')
    assert.match(
      run([several(), '--brand-to', target, '--select', '']),
      /several brands \(classic-id, new-id\)/,
    )
    assert.equal(existsSync(target), false)
  })

  test('an unknown --select fails without a stack trace', () => {
    const result = spawnSync(
      process.execPath,
      [cli, several(), '--brand-to', join(repo(), 'x'), '--select', 'nope'],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /^\[brand-repo\] no brand "nope"/)
  })

  test('a legacy branding/ is baked as the default, with the deprecation warning on stderr', () => {
    const root = repo(brand('branding', 'acme'))
    const out = join(repo(), 'out')
    const result = spawnSync(process.execPath, [cli, root, '--archives', out], { encoding: 'utf8' })
    assert.equal(result.status, 0)
    assert.match(result.stderr, /branding\/ is deprecated/)
    assert.equal(readFileSync(join(out, 'DEFAULT'), 'utf8').trim(), 'acme')
  })

  test('a vanilla repo bakes nothing and says so', () => {
    const out = join(repo(), 'out')
    assert.match(run([repo(), '--archives', out]), /vanilla/)
    assert.equal(existsSync(out), false)
  })

  test('a layout error fails with the rule that was broken, without a stack trace', () => {
    const root = repo({ ...brand('branding', 'a'), ...brand('brandings/b', 'b') })
    const result = spawnSync(process.execPath, [cli, root], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /^\[brand-repo\] .*both branding\/ and brandings\//)
    assert.doesNotMatch(result.stderr, /\bat resolveBrandRepo\b/)
  })

  test('without a repo argument it prints its usage and fails', () => {
    assert.throws(() => run(['--archives', 'x']), /usage: bake-brand-repo.ts/)
  })
})
