import { promises as fs } from 'fs'
import path from 'path'

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
    readdir: jest.fn(() => Promise.resolve([])),
  },
}))

jest.mock(
  '@ocelot-social/branding/dist/discover.js',
  () => ({
    discoverArchives: jest.fn(() => new Map()),
    // The id guard is pure and security-relevant — take the REAL one, so a tightening of
    // BRAND_ID_PATTERN is exercised here instead of being shadowed by a stub.
    isValidBrandId: jest.requireActual('@ocelot-social/branding/dist/buckets.js').isValidBrandId,
    // Real too: it decides WHICH directory is written, including the default when nothing is
    // configured — a stub would make every path assertion below vacuous. Pure (path only, no fs).
    cacheDir: jest.requireActual('@ocelot-social/branding/dist/discover.js').cacheDir,
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
    // clearAllMocks drops recorded CALLS, not implementations — a `mockRejectedValue` set by one test
    // would otherwise make every later test see a failing filesystem. Restore the happy path here so
    // no test depends on the order it runs in.
    for (const fn of [fs.mkdir, fs.writeFile, fs.rename, fs.unlink, fs.access]) {
      fn.mockResolvedValue(undefined)
    }
    fs.readdir.mockResolvedValue([])
    brandingSync._reset()
    process.env.OCELOT_BRANDING_CACHE_DIR = '/cache'
    process.env.GRAPHQL_URI = 'http://backend:4000'
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  // Undone HERE, not at the end of the test that set it: a failing assertion aborts the test body, so
  // trailing cleanup never runs and the next test inherits a foreign TTL/bound.
  afterEach(() => {
    warn.mockRestore()
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete process.env.OCELOT_BRANDING_CACHE_DIR
    delete process.env.GRAPHQL_URI
    delete process.env.OCELOT_BRANDING_SYNC_TTL_MS
    delete process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS
  })

  // Branding is opt-OUT: unconfigured, the sync still runs and mirrors into the default cache. A
  // vanilla backend simply answers "no brands" (covered below), so nothing is written.
  it('runs unconfigured, mirroring into the default cache dir', async () => {
    delete process.env.OCELOT_BRANDING_ASSETS_DIR
    delete process.env.OCELOT_BRANDING_CACHE_DIR
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    const next = await run()

    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringMatching(/\.tmp$/),
      path.resolve('.branding-cache', 'stage.tar.gz'),
    )
    expect(next).toHaveBeenCalled()
  })

  // Running unconfigured means every vanilla deployment reaches the sync on boot; it must not leave a
  // directory behind for a brand set that is empty and was always empty.
  it('creates no cache directory when there is nothing to mirror and none exists', async () => {
    fs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ default: '', brands: [] }))

    await run()

    expect(fs.mkdir).not.toHaveBeenCalled()
    expect(fs.unlink).not.toHaveBeenCalled()
  })

  // …but once a cache exists, an empty manifest is a CHANGE ("the brands were removed") and has to be
  // mirrored like any other, marker included.
  it('still clears the marker when a cache exists and the brands are gone', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ default: '', brands: [] }))

    await run()

    expect(fs.mkdir).toHaveBeenCalledWith('/cache', { recursive: true })
    expect(fs.unlink).toHaveBeenCalledWith('/cache/DEFAULT')
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
  })

  // A validator is only as good as the response it came from: once the backend stops sending one, the
  // remembered ETag describes nothing, and replaying it would let a 304 confirm a copy nobody vouched
  // for. Forget it instead.
  it('forgets the stored ETag when a later answer carries none', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes', 'W/"stage-1-2"'))
    await run()

    process.env.OCELOT_BRANDING_SYNC_TTL_MS = '0'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes', null))
    await run()
    await brandingSync._flush()

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
    })
  })

  // Same trap as the plugin's policy bound. '-1' is the case that BITES here: it arms a timer that
  // fires at once, so the request is aborted before the backend can answer and the sync never lands.
  // 'one minute' collapses to NaN, which happens to read as "no bound" today — the case is kept so a
  // future change cannot start arming a timer for it either.
  it.each([
    ['a negative delay', '-1'],
    ['garbage', 'one minute'],
  ])('ignores %s for the sync timeout and keeps the default bound', async (_case, value) => {
    process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS = value
    let captured
    // Answers a macrotask later, so a bound that fires "immediately" gets there first.
    global.fetch = jest.fn((_url, options) => {
      captured = options.signal
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
        setTimeout(() => resolve(jsonResponse({ default: '', brands: [] })), 5)
      })
    })

    await run()

    expect(captured.aborted).toBe(false)
    expect(warn).not.toHaveBeenCalled()
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

  // "Nothing to clear" is the ordinary case and stays quiet; a marker that cannot be removed is not —
  // the deployment keeps activating a brand the backend no longer names.
  it('reports a marker it cannot clear, but not a missing one', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ default: '', brands: [] }))
    fs.unlink.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await run()
    expect(warn).not.toHaveBeenCalled()

    brandingSync._reset()
    fs.unlink.mockRejectedValueOnce(Object.assign(new Error('read-only fs'), { code: 'EROFS' }))

    await run()

    expect(warn).toHaveBeenCalledWith('[branding] cannot clear the DEFAULT marker:', 'read-only fs')
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

  // The cache MIRRORS the backend, so a brand removed there has to disappear here too — otherwise
  // discovery keeps finding the stale archive and the admin keeps being offered a brand that is gone.
  describe('archives the backend no longer lists', () => {
    it('drops them, and forgets their validators', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      fs.readdir.mockResolvedValue(['stage.tar.gz', 'gone.tar.gz', 'DEFAULT'])

      await run()

      expect(fs.unlink).toHaveBeenCalledWith('/cache/gone.tar.gz')
      // The brand the manifest DOES list is untouched, and so is anything that is not an archive.
      expect(fs.unlink).not.toHaveBeenCalledWith('/cache/stage.tar.gz')
      expect(fs.unlink).not.toHaveBeenCalledWith('/cache/DEFAULT')

      // A brand that comes back must be fetched, not revalidated against the ETag of a deleted file.
      jest.clearAllMocks()
      process.env.OCELOT_BRANDING_SYNC_TTL_MS = '0'
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ default: 'stage', brands: [{ id: 'stage' }, { id: 'gone' }] }),
        )
        .mockResolvedValue(archiveResponse('tarbytes'))
      await run()
      await brandingSync._flush()

      const goneRequest = global.fetch.mock.calls.find(([url]) => url.endsWith('/gone'))
      expect(goneRequest?.[1].headers).toEqual({})
    })

    // An empty manifest is a legitimate answer ("this deployment went vanilla"), not a reason to keep
    // serving whatever the cache still holds.
    it('empties the cache when the backend lists no brands at all', async () => {
      global.fetch = jest.fn().mockResolvedValue(jsonResponse({ default: '', brands: [] }))
      fs.readdir.mockResolvedValue(['stage.tar.gz', 'other.tar.gz'])

      await run()

      expect(fs.unlink).toHaveBeenCalledWith('/cache/stage.tar.gz')
      expect(fs.unlink).toHaveBeenCalledWith('/cache/other.tar.gz')
    })

    // Whatever else lives in the cache was put there by something else. The eviction this replaced
    // deleted files it did not own; that must not come back through the cleanup.
    it('leaves files it did not write alone', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      fs.readdir.mockResolvedValue(['stage-1.0.0.tar.gz', 'notes.txt', '.keep'])

      await run()

      expect(fs.unlink).not.toHaveBeenCalledWith('/cache/notes.txt')
      expect(fs.unlink).not.toHaveBeenCalledWith('/cache/.keep')
    })

    it('survives an unreadable cache directory', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      fs.readdir.mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }))

      const next = await run()

      expect(fs.rename).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), '/cache/stage.tar.gz')
      expect(next).toHaveBeenCalled()
    })

    it('reports one it cannot delete instead of failing the sync', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      fs.readdir.mockResolvedValue(['gone.tar.gz'])
      fs.unlink.mockRejectedValue(Object.assign(new Error('read-only fs'), { code: 'EROFS' }))

      const next = await run()

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('cannot drop the orphaned gone.tar.gz'),
        'read-only fs',
      )
      expect(next).toHaveBeenCalled()
    })
  })

  // The cache is the ONE directory this middleware writes, and the READ search path never decides
  // where that is — the two are deliberately independent.
  it('writes to $OCELOT_BRANDING_CACHE_DIR, not to a root of the read search path', async () => {
    process.env.OCELOT_BRANDING_ASSETS_DIR = `/baked${path.delimiter}/mounted`
    process.env.OCELOT_BRANDING_CACHE_DIR = '/cache'
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(MANIFEST))
      .mockResolvedValueOnce(archiveResponse('tarbytes'))

    await run()

    expect(fs.rename).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), '/cache/stage.tar.gz')
    expect(warn).not.toHaveBeenCalled()
  })

  // Precedence is settled by the search path now (discover.ts), so nothing is deleted to make room —
  // an archive out-ranking the sync from ANOTHER root is the documented rule, not a fault. Only a file
  // inside the cache itself means the directory contract was broken, and that is reported, not fixed.
  describe('an archive shadowing the synced copy', () => {
    // Once per brand, not once per refresh: the fault is a standing configuration problem, and the TTL
    // would otherwise reprint it for as long as the deployment runs.
    it('reports one inside the cache dir WITHOUT deleting it, once', async () => {
      const answers = () =>
        jest
          .fn()
          .mockResolvedValueOnce(jsonResponse(MANIFEST))
          .mockResolvedValueOnce(archiveResponse('tarbytes', null))
      discoverArchives.mockReturnValue(new Map([['stage', { file: '/cache/stage-9.9.9.tar.gz' }]]))

      global.fetch = answers()
      await run()
      process.env.OCELOT_BRANDING_SYNC_TTL_MS = '0'
      global.fetch = answers()
      await run()
      await brandingSync._flush()

      expect(fs.unlink).not.toHaveBeenCalledWith('/cache/stage-9.9.9.tar.gz')
      const shadow = warn.mock.calls.filter((c) => String(c[0]).includes('shadows the synced'))
      expect(shadow).toHaveLength(1)
      expect(shadow[0][0]).toContain(
        '/cache/stage-9.9.9.tar.gz shadows the synced /cache/stage.tar.gz',
      )
      // Scoped to the cache alone — a root of the wider search path is never inspected here.
      expect(discoverArchives).toHaveBeenCalledWith('/cache')
    })

    // The check is diagnostic only — an unreadable cache dir must not turn a successful transfer into
    // a failed sync.
    it('stays silent when the cache cannot be read', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      discoverArchives.mockImplementation(() => {
        throw new Error('EACCES')
      })

      await run()

      expect(fs.rename).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), '/cache/stage.tar.gz')
      expect(warn).not.toHaveBeenCalled()
    })

    it('stays silent when the synced archive wins', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(MANIFEST))
        .mockResolvedValueOnce(archiveResponse('tarbytes'))
      discoverArchives.mockReturnValue(new Map([['stage', { file: '/cache/stage.tar.gz' }]]))

      await run()

      expect(fs.unlink).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
    })
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
