import {
  discoverArchives as mockDiscoverArchives,
  readArchive as mockReadArchive,
  composeArchive as mockComposeArchive,
} from '@ocelot-social/branding/dist/discover.js'

import brandingAssets from './branding-assets.js'

jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(),
    readArchive: jest.fn(),
    composeArchive: jest.fn(),
  }),
  { virtual: true },
)

function makeRes() {
  return {
    headers: {},
    body: undefined,
    setHeader: jest.fn(function setHeader(k, v) {
      this.headers[k] = v
    }),
    end: jest.fn(function end(body) {
      this.body = body
    }),
  }
}

describe('server-middleware/branding-assets', () => {
  let res, next

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/brands'
    res = makeRes()
    next = jest.fn()
  })

  afterEach(() => {
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
  })

  describe('pass-through to next()', () => {
    it('when no assets dir is configured', () => {
      delete process.env.OCELOT_BRANDING_ASSETS_DIR
      brandingAssets({ method: 'GET', url: '/manifest.json' }, res, next)
      expect(next).toHaveBeenCalled()
      expect(mockDiscoverArchives).not.toHaveBeenCalled()
    })

    it('for non-GET/HEAD methods', () => {
      brandingAssets({ method: 'POST', url: '/manifest.json' }, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('for a top-level path that is not the manifest and has no id/entry split', () => {
      brandingAssets({ method: 'GET', url: '/favicon' }, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('for an id that fails the safe-id guard (illegal char)', () => {
      // Note: `..` alone passes the regex (dots are legal); traversal is instead prevented by the Map
      // key lookup. The regex rejects genuinely illegal chars like a (decoded) space.
      brandingAssets({ method: 'GET', url: '/a%20b/logo.svg' }, res, next)
      expect(next).toHaveBeenCalled()
      expect(mockDiscoverArchives).not.toHaveBeenCalled()
    })

    it('for an unknown brand id', () => {
      mockDiscoverArchives.mockReturnValue(new Map())
      brandingAssets({ method: 'GET', url: '/wir/assets/logo.svg' }, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('when the archive cannot be read', () => {
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
      mockReadArchive.mockReturnValue(null)
      brandingAssets({ method: 'GET', url: '/wir/assets/logo.svg' }, res, next)
      expect(next).toHaveBeenCalled()
    })

    it('when the requested entry is absent from the archive', () => {
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
      mockReadArchive.mockReturnValue(new Map())
      brandingAssets({ method: 'GET', url: '/wir/assets/missing.svg' }, res, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('manifest.json (derived from discovered archives)', () => {
    beforeEach(() => {
      mockDiscoverArchives.mockReturnValue(
        new Map([
          ['wir', { id: 'wir', label: 'wir.social', version: '1.0.0' }],
          ['yunite', { id: 'yunite', label: 'yunite.me', version: '2.0.0' }],
        ]),
      )
    })

    it('serves a JSON manifest with a config URL per brand', () => {
      brandingAssets({ method: 'GET', url: '/manifest.json' }, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8')
      expect(res.headers['Cache-Control']).toBe('no-cache')
      expect(JSON.parse(res.body)).toEqual([
        { id: 'wir', label: 'wir.social', version: '1.0.0', config: '/branding/wir/branding.json' },
        {
          id: 'yunite',
          label: 'yunite.me',
          version: '2.0.0',
          config: '/branding/yunite/branding.json',
        },
      ])
    })

    it('answers HEAD without a body', () => {
      brandingAssets({ method: 'HEAD', url: '/manifest.json' }, res, next)
      expect(res.body).toBeUndefined()
      expect(res.end).toHaveBeenCalled()
    })

    it('falls through to next() when discovery throws', () => {
      mockDiscoverArchives.mockImplementation(() => {
        throw new Error('bad dir')
      })
      brandingAssets({ method: 'GET', url: '/manifest.json' }, res, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('virtual branding.json (composed on the fly)', () => {
    beforeEach(() => {
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
      mockReadArchive.mockReturnValue(new Map([['identity/branding.json', Buffer.from('{}')]]))
    })

    it('composes the effective config and serves it', () => {
      mockComposeArchive.mockReturnValue({ id: 'wir', name: 'wir.social' })
      brandingAssets({ method: 'GET', url: '/wir/branding.json' }, res, next)
      expect(mockComposeArchive).toHaveBeenCalled()
      expect(res.headers['Content-Type']).toBe('application/json; charset=utf-8')
      expect(res.headers['Content-Length']).toBe(Buffer.byteLength(res.body))
      expect(JSON.parse(res.body)).toEqual({ id: 'wir', name: 'wir.social' })
    })

    it('answers HEAD for branding.json without a body', () => {
      mockComposeArchive.mockReturnValue({ id: 'wir' })
      brandingAssets({ method: 'HEAD', url: '/wir/branding.json' }, res, next)
      expect(res.body).toBeUndefined()
      expect(res.end).toHaveBeenCalled()
    })

    it('falls through when composition yields nothing', () => {
      mockComposeArchive.mockReturnValue(null)
      brandingAssets({ method: 'GET', url: '/wir/branding.json' }, res, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('real archive entries', () => {
    const svg = Buffer.from('<svg/>')

    beforeEach(() => {
      mockDiscoverArchives.mockReturnValue(new Map([['wir', { file: '/brands/wir.tar.gz' }]]))
    })

    it('serves an asset with the mapped content type and cacheable headers', () => {
      mockReadArchive.mockReturnValue(new Map([['assets/logo.svg', svg]]))
      brandingAssets({ method: 'GET', url: '/wir/assets/logo.svg' }, res, next)
      expect(res.headers['Content-Type']).toBe('image/svg+xml')
      expect(res.headers['Content-Length']).toBe(svg.length)
      expect(res.headers['Cache-Control']).toBe('public, max-age=3600')
      expect(res.body).toBe(svg)
    })

    it('falls back to octet-stream for an unknown extension', () => {
      const bin = Buffer.from('x')
      mockReadArchive.mockReturnValue(new Map([['assets/data.bin', bin]]))
      brandingAssets({ method: 'GET', url: '/wir/assets/data.bin' }, res, next)
      expect(res.headers['Content-Type']).toBe('application/octet-stream')
    })

    it('answers HEAD for an asset without a body', () => {
      mockReadArchive.mockReturnValue(new Map([['assets/logo.svg', svg]]))
      brandingAssets({ method: 'HEAD', url: '/wir/assets/logo.svg' }, res, next)
      expect(res.headers['Content-Length']).toBe(svg.length)
      expect(res.body).toBeUndefined()
      expect(res.end).toHaveBeenCalled()
    })
  })
})
