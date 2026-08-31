const fs = require('fs')
const os = require('os')
const path = require('path')

const { main, newestUnder } = require('./assert-fresh-storybook.js')

// The script reads the working directory, so each test gets a throwaway one it can shape freely.
describe('scripts/assert-fresh-storybook', () => {
  let workdir
  let cwd
  let errors

  const write = (relative, mtimeSeconds) => {
    const full = path.join(workdir, relative)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, 'x')
    if (mtimeSeconds !== undefined) fs.utimesSync(full, mtimeSeconds, mtimeSeconds)
    return full
  }

  // Fixed epoch seconds rather than Date.now(): the whole assertion is about ordering, and a
  // filesystem with coarse mtime granularity would otherwise make "just written" files tie.
  const OLD = 1_600_000_000
  const NEW = 1_700_000_000

  beforeEach(() => {
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'assert-fresh-'))
    cwd = process.cwd()
    process.chdir(workdir)
    errors = []
    jest.spyOn(console, 'error').mockImplementation((message) => errors.push(message))
  })

  afterEach(() => {
    process.chdir(cwd)
    jest.restoreAllMocks()
    fs.rmSync(workdir, { recursive: true, force: true })
  })

  it('fails when the bundle was never built', () => {
    expect(main([])).toBe(1)
    expect(errors.join('\n')).toContain('storybook-static/index.html is missing')
  })

  it('passes when the bundle is newer than every source', () => {
    write('components/Foo/Foo.vue', OLD)
    write('storybook/helpers.js', OLD)
    write('storybook-static/index.html', NEW)
    expect(main([])).toBe(0)
    expect(errors).toEqual([])
  })

  it('fails when a webapp source is newer than the bundle, naming the file', () => {
    write('storybook-static/index.html', OLD)
    write('components/Foo/Foo.story.js', NEW)
    expect(main([])).toBe(1)
    const message = errors.join('\n')
    expect(message).toContain('older than the sources it was built from')
    expect(message).toContain('components/Foo/Foo.story.js')
  })

  // The regression this guard exists for: @ocelot-social/ui rebuilt (or edited) after the bundle.
  // dist/ is what the file: dependency copies, and it is excluded from the generic walk as a build
  // output — so it needs its own explicit check.
  it('fails when a linked package dist is newer than the bundle', () => {
    write('storybook-static/index.html', OLD)
    write('packages/ui/dist/index.mjs', NEW)
    expect(main(['packages/ui'])).toBe(1)
    expect(errors.join('\n')).toContain(path.join('packages/ui/dist', 'index.mjs'))
  })

  it('fails when a linked package source is newer than the bundle', () => {
    write('storybook-static/index.html', OLD)
    write('packages/ui/src/components/OsRibbon/OsRibbon.vue', NEW)
    expect(main(['packages/ui'])).toBe(1)
    expect(errors.join('\n')).toContain('OsRibbon.vue')
  })

  it('ignores a linked package that is not mounted', () => {
    write('storybook-static/index.html', NEW)
    expect(main(['packages/does-not-exist'])).toBe(0)
  })

  it('does not walk node_modules, dist or .git of the webapp itself', () => {
    write('storybook-static/index.html', OLD)
    // All newer than the bundle, none of them a source the bundle is compiled from.
    write('components/node_modules/dep/index.js', NEW)
    write('components/dist/built.js', NEW)
    write('components/.git/HEAD', NEW)
    expect(main([])).toBe(0)
  })

  describe('newestUnder', () => {
    it('returns null for a missing directory', () => {
      expect(newestUnder(path.join(workdir, 'nope'))).toBeNull()
    })

    it('reports the newest file found anywhere below the directory', () => {
      write('tree/a.js', OLD)
      write('tree/deep/nested/b.js', NEW)
      expect(newestUnder('tree').file).toBe(path.join('tree/deep/nested', 'b.js'))
    })
  })
})
