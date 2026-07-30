// The archive routes are the ONLY way the webapp obtains a brand now, so the tests pin the contract
// that matters to it: what the manifest contains, that an unknown/invalid id cannot reach the disk,
// and that revalidation actually saves the transfer.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { setImmediate as tick } from 'node:timers/promises'

import { discoverArchives, readDefaultMarker } from '@ocelot-social/branding/dist/discover.js'

import { brandingRouter } from './routes'

import type { Request, Response } from 'express'

jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(),
    readDefaultMarker: jest.fn(),
    // The id guard is pure and security-relevant — take the REAL one, so a tightening of
    // BRAND_ID_PATTERN is exercised here instead of being shadowed by a stub.
    isValidBrandId: jest.requireActual<{ isValidBrandId: (id: unknown) => boolean }>(
      '@ocelot-social/branding/dist/buckets.js',
    ).isValidBrandId,
  }),
  { virtual: true },
)
jest.mock('node:fs', () => ({ createReadStream: jest.fn() }))
jest.mock('node:fs/promises', () => ({ stat: jest.fn() }))

const mockDiscover = discoverArchives as jest.Mock
const mockDefaultMarker = readDefaultMarker as jest.Mock
const mockStat = stat as jest.Mock
const mockCreateReadStream = createReadStream as jest.Mock

const ARCHIVE = {
  id: 'stage',
  label: 'Stage',
  version: '1.2.3',
  schemaVersion: '0.0.1',
  file: '/brands/stage/dist/stage.tar.gz',
}

interface Manifest {
  default: string
  brands: { id: string; label: string; version: string | null; schemaVersion: string | null }[]
}

const parseManifest = (body: string | undefined): Manifest => JSON.parse(body ?? '') as Manifest

interface MockRes {
  statusCode?: number
  headers: Record<string, string>
  body?: string
  status: jest.Mock
  setHeader: jest.Mock
  json: jest.Mock
  end: jest.Mock
  destroy: jest.Mock
}

function makeRes(): MockRes {
  const res: MockRes = {
    headers: {},
    status: jest.fn(function status(this: MockRes, code: number) {
      this.statusCode = code
      return this
    }),
    setHeader: jest.fn(function setHeader(this: MockRes, k: string, v: string) {
      this.headers[k.toLowerCase()] = v
    }),
    json: jest.fn(function json(this: MockRes, value: unknown) {
      this.body = JSON.stringify(value)
      return this
    }),
    end: jest.fn(function end(this: MockRes, body?: string) {
      if (body !== undefined) this.body = body
      return this
    }),
    destroy: jest.fn(),
  }
  return res
}

// express defers the terminal `next()` through setImmediate, so drain the macrotask queue before
// asserting — otherwise a fall-through looks like "nothing happened".
async function call(
  router: ReturnType<typeof brandingRouter>,
  url: string,
  headers: Record<string, string> = {},
  method = 'GET',
): Promise<{ res: MockRes; next: jest.Mock }> {
  const res = makeRes()
  const next = jest.fn()
  router({ method, url, headers } as unknown as Request, res as unknown as Response, next)
  await tick()
  return { res, next }
}

describe('branding/routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDiscover.mockReturnValue(new Map([[ARCHIVE.id, ARCHIVE]]))
    mockStat.mockResolvedValue({ size: 4096, mtimeMs: 1_700_000_000_123 })
    mockDefaultMarker.mockReturnValue('stage')
  })

  describe('without an assets dir (vanilla deployment)', () => {
    it('registers no routes, so requests fall through', async () => {
      const { res, next } = await call(brandingRouter(undefined), '/manifest.json')
      expect(next).toHaveBeenCalled()
      expect(res.end).not.toHaveBeenCalled()
    })
  })

  describe('GET /manifest.json', () => {
    it('lists the discovered archives without leaking their file paths', async () => {
      const { res } = await call(brandingRouter('/brands'), '/manifest.json')

      expect(parseManifest(res.body)).toEqual({
        default: 'stage',
        brands: [{ id: 'stage', label: 'Stage', version: '1.2.3', schemaVersion: '0.0.1' }],
      })
      expect(res.body).not.toContain('/brands/stage')
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8')
    })

    // Without this a client holds every archive and still renders vanilla, because its brand
    // resolution ends at the DEFAULT marker.
    it('carries the baked default so a client knows which brand to activate', async () => {
      mockDefaultMarker.mockReturnValue('stage')

      const { res } = await call(brandingRouter('/brands'), '/manifest.json')

      expect(parseManifest(res.body).default).toBe('stage')
      expect(mockDefaultMarker).toHaveBeenCalledWith('/brands')
    })

    it('reports an empty default for a vanilla deployment with archives but no marker', async () => {
      mockDefaultMarker.mockReturnValue('')

      const { res } = await call(brandingRouter('/brands'), '/manifest.json')

      expect(parseManifest(res.body)).toEqual({
        default: '',
        brands: [{ id: 'stage', label: 'Stage', version: '1.2.3', schemaVersion: '0.0.1' }],
      })
    })

    it('still lists the brands when the marker cannot be read', async () => {
      mockDefaultMarker.mockImplementation(() => {
        throw new Error('EACCES')
      })

      const { res } = await call(brandingRouter('/brands'), '/manifest.json')

      expect(parseManifest(res.body).default).toBe('')
      expect(parseManifest(res.body).brands).toHaveLength(1)
    })

    it('answers 503 in the SAME shape when the assets dir cannot be read', async () => {
      mockDiscover.mockImplementation(() => {
        throw new Error('EACCES')
      })
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

      const { res } = await call(brandingRouter('/brands'), '/manifest.json')

      expect(res.statusCode).toBe(503)
      expect(parseManifest(res.body)).toEqual({ default: '', brands: [] })
      warn.mockRestore()
    })
  })

  describe('GET /archives/:id', () => {
    it('streams the archive of a known brand', async () => {
      const stream = { on: jest.fn().mockReturnThis(), pipe: jest.fn() }
      mockCreateReadStream.mockReturnValue(stream)

      const { res } = await call(brandingRouter('/brands'), '/archives/stage')

      expect(mockCreateReadStream).toHaveBeenCalledWith(ARCHIVE.file)
      expect(stream.pipe).toHaveBeenCalledWith(res)
      expect(res.headers['content-type']).toBe('application/gzip')
      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
    })

    it('accepts the .tar.gz suffix the archives are named with', async () => {
      mockCreateReadStream.mockReturnValue({ on: jest.fn().mockReturnThis(), pipe: jest.fn() })

      const { res } = await call(brandingRouter('/brands'), '/archives/stage.tar.gz')

      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
    })

    it('answers 304 when the client already has that exact archive', async () => {
      const { res } = await call(brandingRouter('/brands'), '/archives/stage', {
        'if-none-match': 'W/"stage-4096-1700000000123"',
      })

      expect(res.statusCode).toBe(304)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    it('re-transfers when the archive changed without a version bump', async () => {
      mockStat.mockResolvedValue({ size: 5000, mtimeMs: 1_700_000_999_000 })
      mockCreateReadStream.mockReturnValue({ on: jest.fn().mockReturnThis(), pipe: jest.fn() })

      const { res } = await call(brandingRouter('/brands'), '/archives/stage', {
        'if-none-match': 'W/"stage-4096-1700000000123"',
      })

      expect(res.statusCode).not.toBe(304)
      expect(mockCreateReadStream).toHaveBeenCalled()
    })

    it('answers 404 for a brand that is not deployed', async () => {
      const { res } = await call(brandingRouter('/brands'), '/archives/unknown')

      expect(res.statusCode).toBe(404)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    // A traversal attempt never even matches `/archives/:id` (`:id` stops at a slash), so it falls
    // through unhandled; the others reach the handler and are rejected there. Either way the contract
    // that matters holds: no caller-supplied string ever reaches the filesystem.
    it.each(['../../etc/passwd', 'a%2Fb', 'has space', '.', '..'])(
      'never reaches the disk for the malformed id %p',
      async (id) => {
        const { res } = await call(brandingRouter('/brands'), `/archives/${id}`)

        expect(mockCreateReadStream).not.toHaveBeenCalled()
        expect(res.statusCode).not.toBe(200)
        expect(res.headers['content-type']).toBeUndefined()
      },
    )

    it('answers 404 when the discovered file vanished between listing and read', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'))

      const { res } = await call(brandingRouter('/brands'), '/archives/stage')

      expect(res.statusCode).toBe(404)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    it('sends only headers for HEAD', async () => {
      const { res } = await call(brandingRouter('/brands'), '/archives/stage', {}, 'HEAD')

      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })
  })
})
