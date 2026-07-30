import { promises as fs } from 'fs'

import brandingSync from './branding-sync.js'

// The middleware talks to the promise API only (a sync write would stall the event loop the TTL
// refresh is supposed to run beside) — `access` resolving means "the file is there".
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
    rename: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
    access: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(() => new Map()),
    // The id guard is pure and security-relevant — take the REAL one, so a tightening of
    // BRAND_ID_PATTERN is exercised here instead of being shadowed by a stub.
    isValidBrandId: jest.requireActual('@ocelot-social/branding/dist/buckets.js').isValidBrandId,
  }),
  { virtual: true },
)

// eslint-disable-next-line import/order
const { discoverArchives } = require('@ocelot-social/branding/dist/discover.js')

const MANIFEST = { default: 'stage', brands: [{ id: 'stage', label: 'Stage', version: '1.0.0' }] }

function jsonResponse(body, init = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    ...init,
  }
}

function archiveResponse(bytes, etag = 'W/"stage-1-2"') {
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => (k.toLowerCase() === 'etag' ? etag : null) },
    arrayBuffer: () => Promise.resolve(Buffer.from(bytes).buffer),
  }
}

// The middleware only ever calls next(); everything it does is a side effect on the cache dir.
async function run() {
  const next = jest.fn()
  await brandingSync({}, {}, next)
  return next
}

describe('server-middleware/branding-sync', () => {
  let warn

  beforeEach(() => {
    jest.clearAllMocks()
    brandingSync._reset()
    process.env.OCELOT_BRANDING_ASSETS_DIR = '/cache'
    process.env.GRAPHQL_URI = 'http://backend:4000'
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete process.env.GRAPHQL_URI
  })

  it('does nothing without a cache dir configured', async () => {
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    global.fetch = jest.fn()

    const next = await run()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('mirrors every archive the backend lists into the cache dir', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    const next = await run()

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://backend:4000/branding/manifest.json', {
      signal: expect.any(AbortSignal),
    })
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://backend:4000/branding/archives/stage',
      expect.anything(),
    )
    // Written to a temp name first, then renamed — a half-transferred archive is never discoverable.
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/stage\.tar\.gz\.\d+\.tmp$/),
      expect.any(Buffer),
    )
    expect(fs.rename).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), '/cache/stage.tar.gz')
    expect(next).toHaveBeenCalled()
  })

  it('revalidates with the stored ETag and skips the transfer on 304', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes', 'W/"stage-1-2"'))
    await run()
    jest.clearAllMocks()

    // Force the TTL open, then make the refresh observable by awaiting the same in-flight promise.
    process.env.OCELOT_BRANDING_SYNC_TTL_MS = '0'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce({ ok: false, status: 304, headers: { get: () => null } })

    await run()
    await brandingSync._flush()

    expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://backend:4000/branding/archives/stage', {
      headers: { 'if-none-match': 'W/"stage-1-2"' },
      signal: expect.any(AbortSignal),
    })
    expect(fs.rename).not.toHaveBeenCalledWith(expect.any(String), '/cache/stage.tar.gz')
    delete process.env.OCELOT_BRANDING_SYNC_TTL_MS
  })

  it('does not send a stale validator when the cached file is gone', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))
    await run()

    jest.clearAllMocks()

    // KEEP the stored ETag (no _reset) — the point is that a known validator is withheld because the
    // file it describes is gone; resetting would clear the ETag and the assertion would hold anyway.
    fs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    process.env.OCELOT_BRANDING_SYNC_TTL_MS = '0'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    await run()
    await brandingSync._flush()

    expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://backend:4000/branding/archives/stage', {
      headers: {},
      signal: expect.any(AbortSignal),
    })
    delete process.env.OCELOT_BRANDING_SYNC_TTL_MS
  })

  // A backend that accepts the connection and then goes quiet is worse than one that refuses: without
  // a bound on the request itself, the sync promise never settles and every later request queues
  // behind that same dead socket.
  describe('a backend that hangs instead of answering', () => {
    // Never resolves — the socket is open and silent.
    const hang = () => new Promise(() => {})

    it('aborts the backend request itself, not just the wait for it', async () => {
      process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS = '20'
      let captured
      global.fetch = jest.fn((_url, options) => {
        captured = options.signal
        return hang()
      })

      await run()

      // Usually already aborted by the time the middleware returns; otherwise wait for the event. If
      // it never fires, jest fails on its own timeout — no sleep, so there is nothing to tune.
      if (!captured.aborted) {
        await new Promise((resolve) => captured.addEventListener('abort', resolve))
      }
      expect(captured.aborted).toBe(true)
      delete process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS
    })

    it('charges only the first request for the wait, not every later one', async () => {
      process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS = '20'
      global.fetch = jest.fn(hang)

      await run()
      await run()
      await run()

      // One 'sync not ready' means exactly one request waited out the bound; a second would mean the
      // blocking boot path ran again and made another visitor pay for the same dead backend.
      const waited = warn.mock.calls.filter((c) => String(c[0]).includes('sync not ready'))
      expect(waited).toHaveLength(1)
      delete process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS
    })
  })

  it('keeps serving from the existing cache when the backend is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const next = await run()

    expect(fs.rename).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      '[branding] sync from backend failed:',
      expect.stringContaining('ECONNREFUSED'),
    )
  })

  it('retries on the next request after a failure instead of waiting out the TTL', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    await run()

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    await run()

    expect(fs.rename).toHaveBeenCalledWith(expect.any(String), '/cache/stage.tar.gz')
  })

  it('ignores manifest entries whose id could escape the cache dir', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ default: '', brands: [{ id: '../evil' }, { id: 'a/b' }, { id: '' }, null] }),
      )

    await run()

    // Only the manifest was fetched — no id survived the guard.
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  // Brand resolution ends at this marker, so an archive without it renders vanilla.
  it('mirrors the backend default so the synced brand actually activates', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    await run()

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/DEFAULT\.\d+\.tmp$/),
      Buffer.from('stage\n', 'utf8'),
    )
    expect(fs.rename).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), '/cache/DEFAULT')
  })

  it('clears a stale marker when the backend has no default', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse({ default: '', brands: [] }))

    await run()

    expect(fs.unlink).toHaveBeenCalledWith('/cache/DEFAULT')
  })

  it('refuses a default id that could escape the cache dir', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse({ default: '../evil', brands: [] }))

    await run()

    expect(fs.writeFile).not.toHaveBeenCalled()
    expect(fs.unlink).toHaveBeenCalledWith('/cache/DEFAULT')
  })

  it('survives a manifest that is not an array', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(jsonResponse({ not: 'a brands array' }))

    const next = await run()

    expect(next).toHaveBeenCalled()
    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  // A baked brand lands as both `<id>.tar.gz` and `<id>-<version>.tar.gz`; discovery keeps one file
  // per id and breaks a version TIE by walk order, so the stale sibling could out-rank the sync.
  it('evicts a baked sibling that would out-rank the freshly synced archive', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))
    discoverArchives
      .mockReturnValueOnce(new Map([['stage', { file: '/cache/stage-1.0.0.tar.gz' }]]))
      .mockReturnValueOnce(new Map([['stage', { file: '/cache/stage.tar.gz' }]]))

    await run()

    expect(fs.unlink).toHaveBeenCalledWith('/cache/stage-1.0.0.tar.gz')
  })

  it('leaves the directory alone when the synced archive already wins', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))
    discoverArchives.mockReturnValue(new Map([['stage', { file: '/cache/stage.tar.gz' }]]))

    await run()

    expect(fs.unlink).not.toHaveBeenCalled()
  })

  it('reports a partial failure but keeps the archives that arrived', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ default: 'stage', brands: [{ id: 'stage' }, { id: 'other' }] }),
      )
      .mockResolvedValueOnce(archiveResponse('tarbytes'))
      .mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => null } })

    await run()

    expect(fs.rename).toHaveBeenCalledWith(expect.any(String), '/cache/stage.tar.gz')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('1/2 archive(s) failed to sync'),
      expect.stringContaining('HTTP 500'),
    )
  })
})
