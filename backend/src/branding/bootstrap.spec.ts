/* eslint-disable n/no-process-env */
// bootstrap.ts injects the deployed brand at MODULE LOAD (side effect). Each test re-loads it in
// isolation with mocked branding + discover modules and a controlled env, then asserts the observable
// behaviour: setBranding on success, and a warn/error log on the silent-fallback paths.

const BRANDING = '@ocelot-social/branding'
const DISCOVER = '@ocelot-social/branding/dist/discover.js'

interface LoadMocks {
  discoverArchives?: jest.Mock
  readArchiveConfig?: jest.Mock
  readDefaultMarker?: jest.Mock
  setBranding?: jest.Mock
  checkSchemaCompat?: jest.Mock
}

const ORIGINAL_ENV = process.env

function loadBootstrap(mocks: LoadMocks) {
  const setBranding = mocks.setBranding ?? jest.fn()
  jest.doMock(BRANDING, () => ({
    setBranding,
    checkSchemaCompat: mocks.checkSchemaCompat ?? jest.fn(() => 'ok'),
    describeSchemaCompat: jest.fn(() => 'schema mismatch'),
  }))
  jest.doMock(DISCOVER, () => ({
    discoverArchives: mocks.discoverArchives ?? jest.fn(() => new Map()),
    readArchiveConfig: mocks.readArchiveConfig ?? jest.fn(() => null),
    readDefaultMarker: mocks.readDefaultMarker ?? jest.fn(() => ''),
  }))
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require, import-x/no-unassigned-import
    require('./bootstrap')
  })
  return { setBranding }
}

describe('branding bootstrap', () => {
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete process.env.OCELOT_ACTIVE_BRANDING
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    process.env = ORIGINAL_ENV
  })

  it('does nothing when no assets dir is configured', () => {
    const discoverArchives = jest.fn()
    const { setBranding } = loadBootstrap({ discoverArchives })
    expect(discoverArchives).not.toHaveBeenCalled()
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('injects the composed config when the active archive resolves', () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '0.0.1' }
    const config = { metadata: { applicationName: 'Acme' } }
    const { setBranding } = loadBootstrap({
      discoverArchives: jest.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: jest.fn(() => config),
    })
    expect(setBranding).toHaveBeenCalledWith(config)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('warns and keeps defaults when the active brand is not found', () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'missing'
    const { setBranding } = loadBootstrap({
      discoverArchives: jest.fn(() => new Map()), // does not contain 'missing'
    })
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/not found/))
  })

  it('warns and keeps defaults when the archive has no readable config', () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '0.0.1' }
    const { setBranding } = loadBootstrap({
      discoverArchives: jest.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: jest.fn(() => null),
    })
    expect(setBranding).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/no readable config/))
  })

  it('warns on a schema-incompatible archive but still injects the config', () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const archive = { file: '/assets/acme.tar.gz', schemaVersion: '9.9.9' }
    const config = { metadata: { applicationName: 'Acme' } }
    const { setBranding } = loadBootstrap({
      discoverArchives: jest.fn(() => new Map([['acme', archive]])),
      readArchiveConfig: jest.fn(() => config),
      checkSchemaCompat: jest.fn(() => 'archive-newer'),
    })
    expect(setBranding).toHaveBeenCalledWith(config)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('schema mismatch'))
  })

  it('logs an error (never throws) when discovery fails', () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/assets'
    process.env.OCELOT_ACTIVE_BRANDING = 'acme'
    const { setBranding } = loadBootstrap({
      discoverArchives: jest.fn(() => {
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
