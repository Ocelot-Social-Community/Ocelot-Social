/* eslint-disable n/no-process-env */
// bootstrap.ts injects the deployed brand at MODULE LOAD (side effect). Each test re-loads it in
// isolation with mocked branding + discover modules and a controlled env, then asserts the observable
// behaviour: setBranding on success, and a warn/error log on the silent-fallback paths.

import { resolve } from 'node:path'

import type { Mock, MockInstance } from 'vitest'

// vitest has no `isolateModulesAsync`: resetting the registry before the dynamic import does the
// same job, since a module graph is only shared within a file. Wrapped so the call sites keep
// reading as "load this in isolation".
const isolateModules = async (run: () => Promise<void>): Promise<void> => {
  vi.resetModules()
  await run()
}

const BRANDING = '@ocelot-social/branding'
const DISCOVER = '@ocelot-social/branding/dist/discover.js'
// `jest.requireActual` is synchronous and has no ESM counterpart; the real module is
// pulled in once here and the factory below reaches into it.
const actualDiscover = await import('@ocelot-social/branding/dist/discover.js')

interface LoadMocks {
  discoverArchives?: Mock
  readArchiveConfig?: Mock
  readArchive?: Mock
  readDefaultMarker?: Mock
  setBranding?: Mock
  checkSchemaCompat?: Mock
}

const ORIGINAL_ENV = process.env

async function loadBootstrap(mocks: LoadMocks) {
  const setBranding = mocks.setBranding ?? vi.fn()
  const overlayBrandRuntimeFiles = vi.fn()
  vi.doMock(BRANDING, () => ({
    setBranding,
    checkSchemaCompat: mocks.checkSchemaCompat ?? vi.fn(() => 'ok'),
    describeSchemaCompat: vi.fn(() => 'schema mismatch'),
  }))
  vi.doMock(DISCOVER, () => ({
    discoverArchives: mocks.discoverArchives ?? vi.fn(() => new Map()),
    readArchiveConfig: mocks.readArchiveConfig ?? vi.fn(() => null),
    readArchive: mocks.readArchive ?? vi.fn(() => null),
    readDefaultMarker: mocks.readDefaultMarker ?? vi.fn(() => ''),
    // Real: it turns an unset $OCELOT_BRANDING_ASSETS_DIR into the conventional archive locations, so
    // a stub would hide whether bootstrap still resolves a brand without configuration. Pure (paths).
    searchPath: actualDiscover.searchPath,
  }))
  // Mock the on-disk overlay so bootstrap doesn't write brand files into the test's real dirs.
  vi.doMock('./overlayRuntimeFiles', () => ({ overlayBrandRuntimeFiles }))
  await isolateModules(async () => {
    await import('./bootstrap')
  })
  return { setBranding, overlayBrandRuntimeFiles }
}

describe('branding bootstrap', () => {
  let warnSpy: MockInstance<typeof console.warn>
  let errorSpy: MockInstance<typeof console.error>

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete process.env.OCELOT_ACTIVE_BRANDING
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    process.env = ORIGINAL_ENV
  })

  // No env needed to find archives (the search path defaults), but a brand still has to be ACTIVE —
  // pinned by $OCELOT_ACTIVE_BRANDING or named by a DEFAULT marker. Neither → vanilla, silently.
  it('does nothing when no brand is active', async () => {
    const discoverArchives = vi.fn()
    const { setBranding } = await loadBootstrap({ discoverArchives })
    expect(discoverArchives).not.toHaveBeenCalled()
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  // …and BOTH readers are handed the same resolved list. Asserting only on the marker would leave the
  // handover to discoverArchives untested — the mocks ignore their argument, so passing it the raw
  // (unset) env instead of the resolved path would still return an archive here while finding nothing
  // in production.
  it('activates the brand a DEFAULT marker names without any env set', async () => {
    const CONVENTIONAL = [
      resolve('deployment/configurations'),
      resolve('../deployment/configurations'),
    ]
    const archive = { file: 'acme.tar.gz', schemaVersion: '0.0.1' }
    const config = { metadata: { applicationName: 'Acme' } }
    const readDefaultMarker = vi.fn(() => 'acme')
    const discoverArchives = vi.fn(() => new Map([['acme', archive]]))
    const { setBranding } = await loadBootstrap({
      readDefaultMarker,
      discoverArchives,
      readArchiveConfig: vi.fn(() => config),
    })
    expect(readDefaultMarker).toHaveBeenCalledWith(CONVENTIONAL)
    expect(discoverArchives).toHaveBeenCalledWith(CONVENTIONAL)
    expect(setBranding).toHaveBeenCalledWith(config)
  })

  it('injects the composed config when the active archive resolves', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '0.0.1' }
    const config = { metadata: { applicationName: 'Acme' } }
    const { setBranding } = await loadBootstrap({
      discoverArchives: vi.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: vi.fn(() => config),
    })
    expect(setBranding).toHaveBeenCalledWith(config)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('overlays the brand e-mail files from the archive', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '0.0.1' }
    const files = new Map([['emails/templates/registration/html.pug', Buffer.from('p brand')]])
    const { overlayBrandRuntimeFiles } = await loadBootstrap({
      discoverArchives: vi.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: vi.fn(() => ({ metadata: {} })),
      readArchive: vi.fn(() => files),
    })
    const calls = overlayBrandRuntimeFiles.mock.calls as Array<
      [Map<string, Buffer>, { emailsDir: string }]
    >
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe(files)
    // The RESOLVED path, not a substring: bootstrap derives it from its own location, and this spec
    // sits next to bootstrap, so both land on the same sibling directory. A substring check ("contains
    // 'emails'") would pass for any wrong level of the tree — which is exactly how the old public/
    // overlay shipped a path nothing served.
    expect(calls[0][1].emailsDir).toBe(resolve(import.meta.dirname, '..', 'emails'))
  })

  it('warns and keeps defaults when the active brand is not found', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'missing'
    const { setBranding } = await loadBootstrap({
      discoverArchives: vi.fn(() => new Map()), // does not contain 'missing'
    })
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/not found/))
  })

  it('warns and keeps defaults when the archive has no readable config', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '0.0.1' }
    const { setBranding } = await loadBootstrap({
      discoverArchives: vi.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: vi.fn(() => null),
    })
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/no readable config/))
  })

  it('warns on a schema-incompatible archive but still injects the config', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '9.9.9' }
    const config = { metadata: { applicationName: 'Acme' } }
    const { setBranding } = await loadBootstrap({
      discoverArchives: vi.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: vi.fn(() => config),
      checkSchemaCompat: vi.fn(() => 'archive-newer'),
    })
    expect(setBranding).toHaveBeenCalledWith(config)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('schema mismatch'))
  })

  it('logs an error (never throws) when discovery fails', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const { setBranding } = await loadBootstrap({
      discoverArchives: vi.fn(() => {
        throw new Error('boom')
      }),
    })
    expect(setBranding).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/failed to load active brand/),
      expect.any(Error),
    )
  })
})
