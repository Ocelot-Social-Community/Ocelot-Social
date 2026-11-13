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
    assert.deepEqual(r.brands, [])
    assert.equal(r.soleBrand, null)
    assert.equal(r.overlayDir, null)
    assert.deepEqual(r.warnings, [])
  })

  test('empty brandings/ and overlays/ (what ONBUILD COPY leaves behind) count as absent', () => {
    const root = repo()
    for (const dir of ['branding', 'brandings', 'overlays']) {
      mkdirSync(join(root, dir))
    }
    const r = resolveBrandRepo(root)
    assert.deepEqual(r.brands, [])
    assert.deepEqual(r.warnings, [])
  })

  test('a branding/ folder fails with the migration steps', () => {
    assert.throws(
      () => resolveBrandRepo(repo(brand('branding', 'acme'))),
      /branding\/ is no longer supported — move its middlewares\/ and data\/ to overlays\/ \(if any\), then move branding\/ to brandings\/<name>\//,
    )
    assert.throws(() => resolveBrandRepo(repo({ 'branding/data/d.ts': '' })), /no longer supported/)
  })

  test('a single brand in brandings/ is the sole brand', () => {
    const root = repo(brand('brandings/acme', 'acme'))
    const r = resolveBrandRepo(root)
    assert.deepEqual(r.brands, [{ name: 'acme', dir: join(root, 'brandings/acme'), id: 'acme' }])
    assert.equal(r.soleBrand, r.brands[0])
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

  test('a brand.config.js fails instead of dropping the brand, even next to a valid one', () => {
    const root = repo({ ...brand('brandings/a', 'a'), 'brandings/old/brand.config.js': CONFIG })
    assert.throws(
      () => resolveBrandRepo(root),
      /brandings\/old\/brand.config.js is not read any more — rename it to brand.config.mjs .* or port it to brand.config.ts/,
    )
  })

  test('a brand.config.js next to a .ts config is not in the way', () => {
    const root = repo({ ...brand('brandings/a', 'a'), 'brandings/a/brand.config.js': '' })
    assert.equal(resolveBrandRepo(root).soleBrand?.id, 'a')
  })

  test('two brands with the same id fail', () => {
    const root = repo({ ...brand('brandings/a', 'same'), ...brand('brandings/b', 'same') })
    assert.throws(() => resolveBrandRepo(root), /share the brand id "same"/)
  })

  test("a brand whose id is another brand's versioned archive name fails", () => {
    // `acme` at 1.0.0 writes acme-1.0.0.tar.gz — the latest archive of the brand `acme-1.0.0`.
    const root = repo({ ...brand('brandings/a', 'acme'), ...brand('brandings/b', 'acme-1.0.0') })
    assert.throws(
      () => resolveBrandRepo(root),
      /brandings\/a\/ and brandings\/b\/ would both write acme-1\.0\.0\.tar\.gz \(brand ids "acme" and "acme-1\.0\.0"\)/,
    )
  })

  test('a brand without a version writes only its latest archive and resolves', () => {
    // No version, no acme-1.0.0.tar.gz: the brand `acme-1.0.0` next to it shares no file name.
    const root = repo({
      ...brand('brandings/a', 'acme'),
      'brandings/a/package.json': JSON.stringify({ name: 'acme-branding', brandId: 'acme' }),
      ...brand('brandings/b', 'acme-1.0.0'),
    })
    assert.deepEqual(
      resolveBrandRepo(root).brands.map(({ id }) => id),
      ['acme', 'acme-1.0.0'],
    )
  })

  test('ids that only look alike pass when no file name is shared', () => {
    const root = repo({ ...brand('brandings/a', 'acme'), ...brand('brandings/b', 'acme-2.0.0') })
    assert.deepEqual(
      resolveBrandRepo(root).brands.map(({ id }) => id),
      ['acme', 'acme-2.0.0'],
    )
  })

  test('a directory without brand.config is skipped with a warning; no brand at all is vanilla', () => {
    const root = repo({ 'brandings/draft/README.md': '' })
    const r = resolveBrandRepo(root)
    assert.deepEqual(r.brands, [])
    assert.equal(r.soleBrand, null)
    assert.match(r.warnings[0], /brandings\/draft\/ has no brand.config/)
    assert.match(r.warnings[1], /holds no brand/)
  })

  test('overlays/ provides the backend overlays, independent of the brands', () => {
    const root = repo({
      ...brand('brandings/a', 'a'),
      ...brand('brandings/b', 'b'),
      'overlays/middlewares/m.ts': '',
    })
    assert.equal(resolveBrandRepo(root).overlayDir, join(root, 'overlays'))
    const withoutBrands = repo({ 'overlays/data/d.ts': '' })
    assert.equal(resolveBrandRepo(withoutBrands).overlayDir, join(withoutBrands, 'overlays'))
  })

  test('overlays/ holding only .gitkeep files ships nothing', () => {
    const root = repo({ 'overlays/middlewares/.gitkeep': '', 'overlays/data/.gitkeep': '' })
    assert.equal(resolveBrandRepo(root).overlayDir, null)
  })

  test('anything in overlays/ besides middlewares/ and data/ is reported as ignored', () => {
    const root = repo({ 'overlays/public/x.svg': '', 'overlays/.gitkeep': '' })
    const r = resolveBrandRepo(root)
    assert.equal(r.warnings.length, 1)
    assert.match(r.warnings[0], /overlays\/public is not one of middlewares\/, data\/ — ignored/)
  })

  test('overlays inside a brand fail and point to overlays/ — a lone .gitkeep is none', () => {
    const root = repo({
      ...brand('brandings/a', 'a'),
      ...brand('brandings/b', 'b'),
      'brandings/a/middlewares/.gitkeep': '',
      'brandings/b/data/seed.ts': '',
    })
    assert.throws(
      () => resolveBrandRepo(root),
      /^Error: \[brand-repo\] brandings\/b\/ ship middlewares\/ or data\/ — .*move its middlewares\/ and data\/ to overlays\//,
    )
  })

  test('a migrated branding/ without brand.config that kept its overlays fails instead of losing them', () => {
    const root = repo({ 'brandings/old/middlewares/m.ts': '' })
    assert.throws(() => resolveBrandRepo(root), /brandings\/old\/ ship middlewares\/ or data\//)
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
  test('copies the overlay folders of overlays/, nothing else', () => {
    const root = repo({
      ...brand('brandings/acme', 'acme'),
      'overlays/data/d.ts': 'x',
      'overlays/public/p.svg': '',
    })
    const target = join(repo(), 'brand')
    assert.equal(copyOverlays(resolveBrandRepo(root), target), true)
    assert.equal(readFileSync(join(target, 'data/d.ts'), 'utf8'), 'x')
    assert.equal(existsSync(join(target, 'middlewares')), false)
    assert.equal(existsSync(join(target, 'public')), false)
  })

  test('copies nothing when the repo ships no overlays', () => {
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
    const root = repo({ ...brand('brandings/acme', 'acme'), 'overlays/data/d.ts': 'x' })
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

  test('a multi-brand bake removes the DEFAULT marker an earlier single-brand bake left behind', () => {
    const out = join(repo(), 'out')
    run([repo(brand('brandings/acme', 'acme')), '--archives', out])
    assert.ok(existsSync(join(out, 'DEFAULT')))
    assert.match(
      run([several(), '--archives', out]),
      /removed the DEFAULT marker of an earlier bake/,
    )
    assert.equal(existsSync(join(out, 'DEFAULT')), false)
  })

  test('layout warnings go to stderr, the bake goes on', () => {
    const root = repo({ ...brand('brandings/acme', 'acme'), 'brandings/draft/README.md': '' })
    const out = join(repo(), 'out')
    const result = spawnSync(process.execPath, [cli, root, '--archives', out], { encoding: 'utf8' })
    assert.equal(result.status, 0)
    assert.match(result.stderr, /brandings\/draft\/ has no brand.config/)
    assert.ok(existsSync(join(out, 'acme.tar.gz')))
  })

  test('a vanilla repo bakes nothing and says so', () => {
    const out = join(repo(), 'out')
    assert.match(run([repo(), '--archives', out]), /vanilla/)
    assert.equal(existsSync(out), false)
  })

  test('a layout error fails with the rule that was broken, without a stack trace', () => {
    const root = repo(brand('branding', 'a'))
    const result = spawnSync(process.execPath, [cli, root], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /^\[brand-repo\] branding\/ is no longer supported/)
    assert.doesNotMatch(result.stderr, /\bat resolveBrandRepo\b/)
  })

  test('without a repo argument it prints its usage and fails', () => {
    assert.throws(() => run(['--archives', 'x']), /usage: bake-brand-repo.ts/)
  })
})
