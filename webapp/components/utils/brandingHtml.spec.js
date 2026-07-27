import {
  discoverArchives as mockDiscoverArchives,
  readArchive as mockReadArchive,
} from '@ocelot-social/branding/dist/discover.js'

import { fetchBrandingHtml } from './brandingHtml.js'

jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(),
    readArchive: jest.fn(),
  }),
  { virtual: true },
)

describe('fetchBrandingHtml', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete process.server
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete global.fetch
  })

  describe('input guard', () => {
    it.each([
      ['null', null],
      ['a non-string', 42],
      ['a non-/branding path', '/static/foo.html'],
      ['an empty string', ''],
    ])('returns null for %s', async (_label, src) => {
      expect(await fetchBrandingHtml(src)).toBeNull()
    })
  })

  describe('server-side (reads from the archive on disk)', () => {
    beforeEach(() => {
      process.server = true
    })

    it('returns null when no assets dir is configured', async () => {
      delete process.env.OCELOT_BRANDING_ASSETS_DIR
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBeNull()
      expect(mockDiscoverArchives).not.toHaveBeenCalled()
    })

    it('reads the requested entry from the resolved brand archive', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
      mockReadArchive.mockReturnValue(
        new Map([['html/en/imprint.html', Buffer.from('<h1>Imprint</h1>')]]),
      )

      const html = await fetchBrandingHtml('/branding/wir/html/en/imprint.html')

      expect(html).toBe('<h1>Imprint</h1>')
      expect(mockDiscoverArchives).toHaveBeenCalledWith('/brands')
      expect(mockReadArchive).toHaveBeenCalledWith('/brands/wir.tar.gz')
    })

    it('returns null when the path has an id but no entry', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      expect(await fetchBrandingHtml('/branding/wir')).toBeNull()
      expect(mockDiscoverArchives).not.toHaveBeenCalled()
    })

    it('returns null for an id that fails the safe-id guard', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      expect(await fetchBrandingHtml('/branding/..%2Fetc/x.html')).toBeNull()
      expect(await fetchBrandingHtml('/branding/a b/x.html')).toBeNull()
      expect(mockDiscoverArchives).not.toHaveBeenCalled()
    })

    it('returns null when the brand archive is not found', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      mockDiscoverArchives.mockReturnValue(new Map())
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBeNull()
      expect(mockReadArchive).not.toHaveBeenCalled()
    })

    it('returns null when the entry is absent from the archive', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
      mockReadArchive.mockReturnValue(new Map())
      expect(await fetchBrandingHtml('/branding/wir/html/en/missing.html')).toBeNull()
    })

    it('returns null (never throws) when archive reading blows up', async () => {
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
      mockDiscoverArchives.mockImplementation(() => {
        throw new Error('corrupt archive')
      })
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBeNull()
    })
  })

  describe('client-side (fetches the served URL)', () => {
    // process.server is falsy here (browser-like default)
    it('returns the fetched text on a successful response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '<p>hi</p>' })
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBe('<p>hi</p>')
      expect(global.fetch).toHaveBeenCalledWith('/branding/wir/html/en/imprint.html')
    })

    it('returns null on a non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBeNull()
    })

    it('returns null (never throws) when fetch rejects', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network'))
      expect(await fetchBrandingHtml('/branding/wir/html/en/imprint.html')).toBeNull()
    })
  })
})
