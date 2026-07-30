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
    ok: true,
    status: 200,
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
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('archive schema 99 is newer than runtime'),
    )
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

  // An admin choosing "no branding" writes the '@default' sentinel, NOT '' — '' also means "never
  // chosen" and has to keep falling through to the ops pin / baked marker. Without the distinction the
  // choice is unreachable on any image that bakes a default brand.
  describe('explicit vanilla as the base', () => {
    beforeEach(() => {
      mockDiscoverArchives.mockReturnValue(
        new Map([['stage', { id: 'stage', file: '/brands/stage.tar.gz' }]]),
      )
      mockReadDefaultMarker.mockReturnValue('stage')
    })

    it('does NOT fall through to the baked default when vanilla was chosen explicitly', async () => {
      mockPolicy('@default')

      await brandingPlugin(context)

      expect(mockSetBranding).toHaveBeenCalledWith(undefined)
      expect(mockComposeComposition).not.toHaveBeenCalled()
    })

    it('still honours a per-slot override on top of an explicitly vanilla base', async () => {
      mockPolicy('@default', JSON.stringify({ theme: 'stage' }))
      mockComposeComposition.mockReturnValue({ id: 'composed' })

      await brandingPlugin(context)

      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', {
        _default: '',
        theme: 'stage',
      })
    })

    it('DOES fall through to the baked default when nothing was ever chosen', async () => {
      mockPolicy('')
      mockComposeComposition.mockReturnValue({ id: 'stage' })

      await brandingPlugin(context)

      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'stage' })
    })

    it('lets the ops pin win over the baked marker when nothing was chosen', async () => {
      process.env.OCELOT_ACTIVE_BRANDING = 'stage'
      mockPolicy('')
      mockComposeComposition.mockReturnValue({ id: 'stage' })

      await brandingPlugin(context)

      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'stage' })
      delete process.env.OCELOT_ACTIVE_BRANDING
    })
  })

  // webpack's DefinePlugin compiles `process.env.GRAPHQL_URI` into the bundle at BUILD time (nuxt's
  // `env` option), so in a container it is frozen to the localhost fallback no matter what the
  // orchestrator sets. The URI therefore has to come from privateRuntimeConfig, resolved at server
  // start — this is exactly what made SSR silently query localhost in production.
  describe('backend URI resolution', () => {
    it('uses the RUNTIME config, not the value compiled into the bundle', async () => {
      process.env.GRAPHQL_URI = 'http://compiled-in-at-build-time:4000'
      mockPolicy('nutrimind')
      mockDiscoverArchives.mockReturnValue(
        new Map([['nutrimind', { id: 'nutrimind', file: '/n.tar.gz' }]]),
      )
      mockComposeComposition.mockReturnValue({ id: 'nutrimind' })

      await brandingPlugin({
        ...context,
        $config: { graphqlUri: 'http://release-backend:4000' },
      })

      expect(global.fetch).toHaveBeenCalledWith('http://release-backend:4000', expect.anything())
      delete process.env.GRAPHQL_URI
    })

    it('falls back to the env var when no runtime config is present', async () => {
      process.env.GRAPHQL_URI = 'http://from-env:4000'
      mockPolicy('nutrimind')
      mockDiscoverArchives.mockReturnValue(
        new Map([['nutrimind', { id: 'nutrimind', file: '/n.tar.gz' }]]),
      )
      mockComposeComposition.mockReturnValue({ id: 'nutrimind' })

      await brandingPlugin(context)

      expect(global.fetch).toHaveBeenCalledWith('http://from-env:4000', expect.anything())
      delete process.env.GRAPHQL_URI
    })
  })

  // An unreachable backend is INDISTINGUISHABLE in the rendered page from "nothing switched": the
  // loader falls through to the baked DEFAULT marker and serves the image's brand, silently overriding
  // every admin choice. That is how a misconfigured GRAPHQL_URI stayed hidden — so it has to be loud.
  describe('when the policy cannot be fetched', () => {
    let warn

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.GRAPHQL_URI = 'http://backend:4000'
      // The ops pin the loader falls through to when the policy is unavailable.
      process.env.OCELOT_ACTIVE_BRANDING = 'stage'
      mockDiscoverArchives.mockReturnValue(
        new Map([['stage', { id: 'stage', file: '/brands/stage.tar.gz' }]]),
      )
      mockComposeComposition.mockReturnValue({ id: 'stage' })
    })

    afterEach(() => {
      warn.mockRestore()
      delete process.env.GRAPHQL_URI
      delete process.env.OCELOT_ACTIVE_BRANDING
    })

    it('warns and names the consequence when the request fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      await brandingPlugin(context)

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('policy query to http://backend:4000 failed (ECONNREFUSED)'),
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('will be IGNORED'))
    })

    it('reports a timeout as such rather than as an opaque abort', async () => {
      const abort = new Error('aborted')
      abort.name = 'AbortError'
      global.fetch = jest.fn().mockRejectedValue(abort)

      await brandingPlugin(context)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no answer within 2000ms'))
    })

    // setTimeout coerces NaN and negative delays to 0, so a mistyped bound would abort the request
    // before it is sent and silently un-brand every render. The default has to survive the typo.
    it.each([
      ['garbage', 'two seconds'],
      ['a negative delay', '-1'],
      ['an empty value', ''],
    ])('ignores %s for the policy timeout and keeps the default bound', async (_case, value) => {
      process.env.OCELOT_BRANDING_POLICY_TIMEOUT_MS = value
      const config = { id: 'nutrimind' }
      mockDiscoverArchives.mockReturnValue(
        new Map([['nutrimind', { id: 'nutrimind', file: '/brands/n.tar.gz' }]]),
      )
      mockComposeComposition.mockReturnValue(config)
      // Answers a tick later — a bound of 0 fires first, a bound of 2000ms does not.
      global.fetch = jest.fn(
        (_uri, options) =>
          new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const aborted = new Error('aborted')
              aborted.name = 'AbortError'
              reject(aborted)
            })
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({
                    data: {
                      policy: [
                        { key: 'activeBranding', value: JSON.stringify('nutrimind') },
                        { key: 'brandingComposition', value: JSON.stringify('') },
                      ],
                    },
                  }),
                }),
              5,
            )
          }),
      )

      await brandingPlugin(context)

      expect(warn).not.toHaveBeenCalled()
      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'nutrimind' })
      delete process.env.OCELOT_BRANDING_POLICY_TIMEOUT_MS
    })

    it('treats a bound of 0 as "no bound" rather than "abort at once"', async () => {
      jest.useFakeTimers()
      process.env.OCELOT_BRANDING_POLICY_TIMEOUT_MS = '0'
      mockDiscoverArchives.mockReturnValue(
        new Map([['nutrimind', { id: 'nutrimind', file: '/brands/n.tar.gz' }]]),
      )
      mockComposeComposition.mockReturnValue({ id: 'nutrimind' })
      // Answers only after FIVE times the default bound: if 0 armed a timer — its own or the default
      // one — the request would be aborted long before this resolves.
      global.fetch = jest.fn(
        (_uri, options) =>
          new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const aborted = new Error('aborted')
              aborted.name = 'AbortError'
              reject(aborted)
            })
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({
                    data: {
                      policy: [{ key: 'activeBranding', value: JSON.stringify('nutrimind') }],
                    },
                  }),
                }),
              10_000,
            )
          }),
      )

      const pending = brandingPlugin(context)
      await jest.advanceTimersByTimeAsync(10_000)
      await pending

      expect(warn).not.toHaveBeenCalled()
      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'nutrimind' })
      jest.useRealTimers()
      delete process.env.OCELOT_BRANDING_POLICY_TIMEOUT_MS
    })

    // The endpoint stays in the log (that is what makes a wrong GRAPHQL_URI visible), but nothing that
    // could be a credential does — userinfo and the query string are dropped on both warning paths.
    it.each([
      [
        'a non-2xx answer',
        () => {
          global.fetch = jest
            .fn()
            .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) })
        },
      ],
      [
        'a transport failure',
        () => {
          global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
        },
      ],
    ])('keeps credentials out of the log when reporting %s', async (_case, arrange) => {
      process.env.GRAPHQL_URI = 'http://svc:s3cr3t@backend:4000/graphql?token=leaked'
      arrange()

      await brandingPlugin(context)

      const logged = warn.mock.calls.map((c) => String(c[0])).join('\n')
      expect(logged).toContain('http://backend:4000/graphql')
      expect(logged).not.toContain('s3cr3t')
      expect(logged).not.toContain('leaked')
      expect(logged).not.toContain('svc:')
    })

    it('warns on a non-2xx answer instead of parsing it as a policy', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) })

      await brandingPlugin(context)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('answered HTTP 502'))
    })

    it('still renders the fallback brand rather than failing the request', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      await brandingPlugin(context)

      // $OCELOT_ACTIVE_BRANDING pins 'stage' — the page stays branded, just not by the policy.
      expect(mockComposeComposition).toHaveBeenCalledWith('/brands', { _default: 'stage' })
    })
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
