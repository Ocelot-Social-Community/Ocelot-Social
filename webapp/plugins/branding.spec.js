// The mock factories create the jest.fns (they cannot reference an outer const, so we grab the same
// fns back via these imports). jest.mock is hoisted above the imports by babel-jest, so the modules
// resolve to the mocks below despite the source order.
import { setBranding as mockSetBranding } from '@ocelot-social/branding'
import {
  discoverArchives as mockDiscoverArchives,
  composeComposition as mockComposeComposition,
  readDefaultMarker as mockReadDefaultMarker,
  checkSchemaCompat as mockCheckSchemaCompat,
  describeSchemaCompat as mockDescribeSchemaCompat,
} from '@ocelot-social/branding/dist/discover.js'

import brandingPlugin from './branding.js'

jest.mock('@ocelot-social/branding', () => ({ setBranding: jest.fn() }))
jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(),
    composeComposition: jest.fn(),
    readDefaultMarker: jest.fn(() => ''),
    // The plugin warns (never fatal) when the resolved base archive's schema diverges from the
    // runtime; default to 'ok' so the happy path skips the warning branch.
    checkSchemaCompat: jest.fn(() => 'ok'),
    describeSchemaCompat: jest.fn(() => ''),
  }),
  { virtual: true },
)

// Reply to the SSR fetchBrandingPolicy() GraphQL call with activeBranding + brandingComposition
// (both transported JSON-encoded; brandingComposition is itself a JSON string or '').
function mockPolicy(activeBranding, brandingComposition = '') {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      data: {
        policy: [
          { key: 'activeBranding', value: JSON.stringify(activeBranding) },
          { key: 'brandingComposition', value: JSON.stringify(brandingComposition) },
        ],
      },
    }),
  })
}

describe('plugins/branding (SSR injection)', () => {
  let context

  beforeEach(() => {
    jest.clearAllMocks()
    process.server = true
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
    delete process.env.OCELOT_ACTIVE_BRANDING
    mockReadDefaultMarker.mockReturnValue('')
    mockCheckSchemaCompat.mockReturnValue('ok')
    context = { beforeNuxtRender: jest.fn() }
  })

  afterEach(() => {
    delete process.server
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
  })

  it('injects the composed brand config and serialises it to the client', async () => {
    const config = { id: 'nutrimind', links: { footerOrder: ['imprint'] } }
    mockPolicy('nutrimind')
    mockDiscoverArchives.mockReturnValue(
      new Map([['nutrimind', { id: 'nutrimind', file: '/brands/n.tar.gz' }]]),
    )
    mockComposeComposition.mockReturnValue(config)

    await brandingPlugin(context)

    // base brand → composition map with just _default; no per-slot overrides
    expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'nutrimind' })
    expect(mockSetBranding).toHaveBeenCalledWith(config)
    const nuxtState = {}
    context.beforeNuxtRender.mock.calls[0][0]({ nuxtState })
    expect(nuxtState.branding).toEqual(config)
    expect(nuxtState.brandingId).toBe('nutrimind')
    expect(nuxtState.brandingComposition).toBe('')
  })

  it('composes ACROSS brands from the composition map (theme of one, identity of another)', async () => {
    const config = { id: 'composed' }
    const composition = JSON.stringify({ identity: 'nutriminds' })
    mockPolicy('yunite', composition)
    mockDiscoverArchives.mockReturnValue(
      new Map([
        ['yunite', { id: 'yunite', file: '/brands/y.tar.gz' }],
        ['nutriminds', { id: 'nutriminds', file: '/brands/n.tar.gz' }],
      ]),
    )
    mockComposeComposition.mockReturnValue(config)

    await brandingPlugin(context)

    expect(mockComposeComposition).toHaveBeenCalledWith('/brands', {
      _default: 'yunite',
      identity: 'nutriminds',
    })
    const nuxtState = {}
    context.beforeNuxtRender.mock.calls[0][0]({ nuxtState })
    expect(nuxtState.brandingId).toBe('yunite')
    expect(nuxtState.brandingComposition).toBe(composition)
  })

  it('still brands (never fatal) but WARNS when the base archive schema diverges from the runtime', async () => {
    const config = { id: 'nutrimind' }
    mockPolicy('nutrimind')
    mockDiscoverArchives.mockReturnValue(
      new Map([['nutrimind', { id: 'nutrimind', file: '/brands/n.tar.gz', schemaVersion: 99 }]]),
    )
    mockCheckSchemaCompat.mockReturnValue('newer')
    mockDescribeSchemaCompat.mockReturnValue('archive schema 99 is newer than runtime')
    mockComposeComposition.mockReturnValue(config)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await brandingPlugin(context)

    expect(mockCheckSchemaCompat).toHaveBeenCalledWith(99)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('archive schema 99 is newer than runtime'))
    // still branded despite the mismatch
    expect(mockSetBranding).toHaveBeenCalledWith(config)
    warn.mockRestore()
  })

  it('brands from composition alone even when the base is vanilla', async () => {
    mockPolicy('', JSON.stringify({ theme: 'yunite' }))
    mockDiscoverArchives.mockReturnValue(new Map([['yunite', { id: 'yunite', file: '/y.tar.gz' }]]))
    mockComposeComposition.mockReturnValue({ id: 'x' })

    await brandingPlugin(context)

    expect(mockComposeComposition).toHaveBeenCalledWith('/brands', {
      _default: '',
      theme: 'yunite',
    })
    expect(mockSetBranding).not.toHaveBeenCalledWith(undefined)
  })

  it('RESETS to vanilla (setBranding undefined) when the request resolves to no brand — no stale leak', async () => {
    // The active brand was switched back to default (''); the archive for the (empty) id is not found.
    mockPolicy('')
    mockDiscoverArchives.mockReturnValue(
      new Map([['nutrimind', { id: 'nutrimind', file: '/brands/n.tar.gz' }]]),
    )

    await brandingPlugin(context)

    // Must explicitly reset the shared process-global, NOT leave a prior request's brand in place.
    expect(mockSetBranding).toHaveBeenCalledWith(undefined)
    expect(context.beforeNuxtRender).not.toHaveBeenCalled()
  })

  it('RESETS to vanilla when no assets dir is configured', async () => {
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    await brandingPlugin(context)
    expect(mockSetBranding).toHaveBeenCalledWith(undefined)
  })

  it('RESETS to vanilla on any failure (never renders a leaked brand)', async () => {
    mockPolicy('nutrimind')
    mockDiscoverArchives.mockImplementation(() => {
      throw new Error('discovery blew up')
    })
    await brandingPlugin(context)
    expect(mockSetBranding).toHaveBeenCalledWith(undefined)
  })

  it('on the client, replays the SSR-serialised branding', async () => {
    delete process.server
    const config = { id: 'wir' }
    window.__NUXT__ = { branding: config }
    await brandingPlugin({})
    expect(mockSetBranding).toHaveBeenCalledWith(config)
    delete window.__NUXT__
  })
})
