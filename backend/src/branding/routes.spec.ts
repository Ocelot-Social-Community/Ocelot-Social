// The archive routes are the ONLY way the webapp obtains a brand now, so the tests pin the contract
// that matters to it: what the manifest contains, that an unknown/invalid id cannot reach the disk,
// and that revalidation actually saves the transfer.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { PassThrough, Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { setImmediate as tick } from 'node:timers/promises'

import { brandingRouter } from './routes'

import type { BrandingRouterDeps } from './routes'
import type { Request, Response } from 'express'

jest.mock('node:fs', () => ({ createReadStream: jest.fn() }))
jest.mock('node:fs/promises', () => ({ stat: jest.fn() }))

// The two disk readers are INJECTED, not module-mocked. `@ocelot-social/branding/dist/discover.js` is
// a subpath of a `file:` dependency, and whether jest bound a mock of it to routes.ts depended on the
// environment: green here, silently ignored in the CI container, where the router then read the real
// filesystem and every fixture-based expectation failed. Passing the fakes in removes the question.
// The id guard is NOT faked — routes.ts keeps importing the real one, so a tightening of
// BRAND_ID_PATTERN is exercised here instead of being shadowed by a stub.
const mockDiscover = jest.fn() as jest.MockedFunction<BrandingRouterDeps['discoverArchives']>
const mockDefaultMarker = jest.fn() as jest.MockedFunction<BrandingRouterDeps['readDefaultMarker']>
const deps: BrandingRouterDeps = {
  discoverArchives: mockDiscover,
  readDefaultMarker: mockDefaultMarker,
}
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

interface MockRes extends PassThrough {
  statusCode?: number
  headers: Record<string, string>
  body?: string
  status: jest.Mock
  setHeader: jest.Mock
  json: jest.Mock
}

// A REAL Writable, not a bag of jest.fn()s: the archive route hands the response to
// stream.pipeline(), which only accepts an actual stream and whose whole point (tearing the file
// stream down when the response dies) is unobservable against a fake. Everything a stream does not
// provide — status/setHeader/json — is bolted on the way express does.
function makeRes(): MockRes {
  const chunks: Buffer[] = []
  const res = new PassThrough() as MockRes
  res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
  res.headers = {}
  Object.defineProperty(res, 'body', {
    get: () => (chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined),
    set: (value: string) => {
      chunks.length = 0
      chunks.push(Buffer.from(value, 'utf8'))
    },
    configurable: true,
  })
  res.status = jest.fn(function status(this: MockRes, code: number) {
    this.statusCode = code
    return this
  })
  res.setHeader = jest.fn(function setHeader(this: MockRes, k: string, v: string) {
    this.headers[k.toLowerCase()] = v
  }) as unknown as jest.Mock
  res.json = jest.fn(function json(this: MockRes, value: unknown) {
    this.body = JSON.stringify(value)
    return this
  })
  jest.spyOn(res, 'end')
  jest.spyOn(res, 'destroy')
  // pipeline propagates a source failure by destroying the response WITH that error; an unhandled
  // 'error' on a stream would take the process down instead of failing the test.
  res.on('error', () => {})
  return res
}

// Settle once the response is done, however it ended — pipeline finishes it on success and destroys
// it on abort/read failure, and both count as "the request is over".
async function settled(res: MockRes): Promise<void> {
  // Aborted or failed mid-transfer rejects — that IS the terminal state the test waits for.
  await finished(res).catch(() => undefined)
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
    // A deployment may set $OCELOT_BRANDING_ASSETS_DIR, so a router that defaulted
    // to it would serve archives here — and every assertion about a vanilla deployment would depend on
    // where the suite happens to run. The dir is an argument; the env is read once in server.ts.
    it('ignores an ambient $OCELOT_BRANDING_ASSETS_DIR', async () => {
      // eslint-disable-next-line n/no-process-env -- the ambient environment IS what this pins
      process.env.OCELOT_BRANDING_ASSETS_DIR = '/app/deployment/configurations'

      const { res } = await call(brandingRouter(undefined, deps), '/manifest.json')

      expect(parseManifest(res.body)).toEqual({ default: '', brands: [] })
      expect(mockDiscover).not.toHaveBeenCalled()
      // eslint-disable-next-line n/no-process-env -- see above
      delete process.env.OCELOT_BRANDING_ASSETS_DIR
    })

    // A vanilla backend has no brands; that is an ANSWER, not a missing endpoint. Falling through
    // reaches the GraphQL middleware mounted at '/' (server.ts), which logs the poll as a malformed
    // operation — and the webapp reads the resulting HTTP 400 as a failed sync and retries forever.
    it('answers an empty manifest instead of falling through to the GraphQL handler', async () => {
      const { res, next } = await call(brandingRouter(undefined, deps), '/manifest.json')

      expect(parseManifest(res.body)).toEqual({ default: '', brands: [] })
      expect(next).not.toHaveBeenCalled()
    })

    it('answers 404 for an archive instead of falling through', async () => {
      const { res, next } = await call(brandingRouter(undefined, deps), '/archives/stage')

      expect(res.statusCode).toBe(404)
      expect(next).not.toHaveBeenCalled()
    })
  })

  // The injected fakes cover every other test, so the DEFAULTS — what production actually runs with —
  // would otherwise never be exercised: a wrong import there would ship unnoticed.
  it('falls back to the real disk readers when none are injected', async () => {
    const { res, next } = await call(brandingRouter('/does-not-exist'), '/manifest.json')

    // The real readers on a directory that is not there: no brands, no marker, and no throw.
    expect(parseManifest(res.body)).toEqual({ default: '', brands: [] })
    expect(next).not.toHaveBeenCalled()
    expect(mockDiscover).not.toHaveBeenCalled() // the fakes are genuinely out of the picture
  })

  // A broken assets dir must degrade to "unknown brand", never to a 500.
  it('answers 404 when discovery throws while resolving an archive', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockDiscover.mockImplementation(() => {
      throw new Error('EACCES')
    })

    const { res } = await call(brandingRouter('/brands', deps), '/archives/stage')

    expect(res.statusCode).toBe(404)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('cannot read /brands'),
      expect.anything(),
    )
    warn.mockRestore()
  })

  // Same reason: nothing under /branding may reach the GraphQL handler behind it.
  describe('unknown paths under the mount', () => {
    it.each(['/nope', '/archives', '/manifest.json/extra'])(
      'answers 404 for %p rather than handing it on',
      async (path) => {
        const { res, next } = await call(brandingRouter('/brands', deps), path)

        expect(res.statusCode).toBe(404)
        expect(next).not.toHaveBeenCalled()
      },
    )
  })

  describe('GET /manifest.json', () => {
    it('lists the discovered archives without leaking their file paths', async () => {
      const { res } = await call(brandingRouter('/brands', deps), '/manifest.json')

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

      const { res } = await call(brandingRouter('/brands', deps), '/manifest.json')

      expect(parseManifest(res.body).default).toBe('stage')
      expect(mockDefaultMarker).toHaveBeenCalledWith('/brands')
    })

    it('reports an empty default for a vanilla deployment with archives but no marker', async () => {
      mockDefaultMarker.mockReturnValue('')

      const { res } = await call(brandingRouter('/brands', deps), '/manifest.json')

      expect(parseManifest(res.body)).toEqual({
        default: '',
        brands: [{ id: 'stage', label: 'Stage', version: '1.2.3', schemaVersion: '0.0.1' }],
      })
    })

    it('still lists the brands when the marker cannot be read', async () => {
      mockDefaultMarker.mockImplementation(() => {
        throw new Error('EACCES')
      })

      const { res } = await call(brandingRouter('/brands', deps), '/manifest.json')

      expect(parseManifest(res.body).default).toBe('')
      expect(parseManifest(res.body).brands).toHaveLength(1)
    })

    it('answers 503 in the SAME shape when the assets dir cannot be read', async () => {
      mockDiscover.mockImplementation(() => {
        throw new Error('EACCES')
      })
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

      const { res } = await call(brandingRouter('/brands', deps), '/manifest.json')

      expect(res.statusCode).toBe(503)
      expect(parseManifest(res.body)).toEqual({ default: '', brands: [] })
      warn.mockRestore()
    })
  })

  describe('GET /archives/:id', () => {
    it('streams the archive of a known brand', async () => {
      mockCreateReadStream.mockReturnValue(Readable.from(['tar-bytes']))

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage')
      await settled(res)

      expect(mockCreateReadStream).toHaveBeenCalledWith(ARCHIVE.file)
      expect(res.body).toBe('tar-bytes')
      expect(res.headers['content-type']).toBe('application/gzip')
      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
    })

    // A download nobody finishes must not pin the file descriptor: `.pipe()` only unpipes when the
    // destination dies, so the read stream would stay open — one leaked fd per aborted request.
    it('tears the file stream down when the client aborts mid-transfer', async () => {
      // Never ends on its own, so the transfer is still in flight when the client goes away.
      const source = new Readable({ read() {} })
      source.push('first-chunk')
      mockCreateReadStream.mockReturnValue(source)

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage')
      res.destroy()
      await settled(res)
      await tick()

      expect(source.destroyed).toBe(true)
    })

    it('aborts the response when the read fails after the headers are out', async () => {
      const source = new Readable({
        read() {
          this.destroy(new Error('EIO'))
        },
      })
      mockCreateReadStream.mockReturnValue(source)

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage')
      await settled(res)
      await tick()

      // Status and headers are already on the wire — killing the socket is all that is left.
      expect(res.destroyed).toBe(true)
      expect(res.body).not.toBe('')
    })

    it('accepts the .tar.gz suffix the archives are named with', async () => {
      mockCreateReadStream.mockReturnValue(Readable.from(['tar-bytes']))

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage.tar.gz')
      await settled(res)

      expect(mockCreateReadStream).toHaveBeenCalledWith(ARCHIVE.file)
      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
    })

    // Brand ids may contain dots (this network runs `stage.ocelot.social`), so one that ends in
    // `.tar.gz` is a legitimate id — and must beat the convenience alias, which would otherwise hand
    // out a DIFFERENT brand's archive under its name.
    it('prefers a brand whose id itself ends in .tar.gz over the suffix alias', async () => {
      const literal = { ...ARCHIVE, id: 'stage.tar.gz', file: '/brands/literal.tar.gz' }
      mockDiscover.mockReturnValue(
        new Map([
          [ARCHIVE.id, ARCHIVE],
          [literal.id, literal],
        ]),
      )
      mockCreateReadStream.mockReturnValue(Readable.from(['tar-bytes']))

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage.tar.gz')
      await settled(res)

      expect(mockCreateReadStream).toHaveBeenCalledWith(literal.file)
      // The validator names the RESOLVED brand, so the two do not revalidate against each other.
      expect(res.headers.etag).toBe('W/"stage.tar.gz-4096-1700000000123"')
    })

    it('answers 304 when the client already has that exact archive', async () => {
      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage', {
        'if-none-match': 'W/"stage-4096-1700000000123"',
      })

      expect(res.statusCode).toBe(304)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    it('re-transfers when the archive changed without a version bump', async () => {
      mockStat.mockResolvedValue({ size: 5000, mtimeMs: 1_700_000_999_000 })
      mockCreateReadStream.mockReturnValue(Readable.from(['tar-bytes']))

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage', {
        'if-none-match': 'W/"stage-4096-1700000000123"',
      })

      expect(res.statusCode).not.toBe(304)
      expect(mockCreateReadStream).toHaveBeenCalled()
    })

    it('answers 404 for a brand that is not deployed', async () => {
      const { res } = await call(brandingRouter('/brands', deps), '/archives/unknown')

      expect(res.statusCode).toBe(404)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    // A traversal attempt never even matches `/archives/:id` (`:id` stops at a slash), so it falls
    // through unhandled; the others reach the handler and are rejected there. Either way the contract
    // that matters holds: no caller-supplied string ever reaches the filesystem.
    it.each(['../../etc/passwd', 'a%2Fb', 'has space', '.', '..'])(
      'never reaches the disk for the malformed id %p',
      async (id) => {
        const { res } = await call(brandingRouter('/brands', deps), `/archives/${id}`)

        expect(mockCreateReadStream).not.toHaveBeenCalled()
        expect(res.statusCode).not.toBe(200)
        expect(res.headers['content-type']).toBeUndefined()
      },
    )

    it('answers 404 when the discovered file vanished between listing and read', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'))

      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage')

      expect(res.statusCode).toBe(404)
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })

    it('sends only headers for HEAD', async () => {
      const { res } = await call(brandingRouter('/brands', deps), '/archives/stage', {}, 'HEAD')

      expect(res.headers.etag).toBe('W/"stage-4096-1700000000123"')
      expect(mockCreateReadStream).not.toHaveBeenCalled()
    })
  })
})
