// Acquire the brand archives from the BACKEND instead of shipping them in this image: the backend
// serves what it has on disk (GET /branding/manifest.json + /branding/archives/<id>, see
// backend/src/branding/routes.ts) and this middleware mirrors them into $OCELOT_BRANDING_ASSETS_DIR.
//
// Everything downstream is unchanged and SYNCHRONOUS — the branding-assets middleware, the SSR
// branding plugin and brandingHtml keep reading `<dir>/*.tar.gz` off disk. That is the whole point of
// mirroring to a file instead of holding the archives in memory: one deployed copy (the backend's),
// no async rewrite of every consumer.
//
// The local copy is a CACHE, never the source of truth. It is rebuilt from the backend on boot and
// refreshed on a TTL; if the backend is unreachable, whatever is already on disk stays valid (a baked
// image archive, or the previous sync) so a backend blip cannot un-brand the webapp.
//
// Registered FIRST in nuxt.config.js `serverMiddleware`, so the initial sync completes before the
// branding-assets middleware or SSR read the directory.
const fs = require('fs').promises
const path = require('path')

// eslint-disable-next-line import/no-unresolved -- package subpath, server-only (uses node:fs)
const { discoverArchives, isValidBrandId } = require('@ocelot-social/branding/dist/discover.js')

// Read per call, not at module load: the webapp's server middleware is loaded once per process, and
// capturing the env here would freeze whatever was set at import time.
// How long a completed sync is trusted before the next request triggers a background refresh.
const ttlMs = () => Number(process.env.OCELOT_BRANDING_SYNC_TTL_MS || 60_000)
// Two bounds, one knob. It caps (a) the FIRST (blocking) sync, so a slow or dead backend cannot hold
// the first page render, and (b) every INDIVIDUAL backend request, so a socket that opens and then
// goes quiet cannot pin the sync forever. Both are needed: (a) alone only stops the WAITING — the
// request underneath keeps hanging, and since it stays the in-flight sync every later request would
// queue behind the same dead socket. Node's fetch has no timeout of its own.
const timeoutMs = () => Number(process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS || 5_000)

// id → ETag of the archive currently on disk, so a refresh transfers nothing while it is unchanged.
const etags = new Map()
let lastSync = 0
let inFlight = null
// Whether the one blocking boot attempt has been spent (see the middleware).
let bootBlockSpent = false

function backendUrl() {
  // Same origin the branding plugin already talks to for the activeBranding policy.
  return (process.env.GRAPHQL_URI || 'http://localhost:4000').replace(/\/+$/, '')
}

// Run one backend request under its own AbortController, so the abort covers the RESPONSE BODY too,
// not just the headers — a transfer that stalls halfway is the same dead socket. The timer is cleared
// once the body has been consumed, never before.
async function withRequestTimeout(run) {
  const controller = new AbortController()
  const ms = timeoutMs()
  const timer = ms ? setTimeout(() => controller.abort(), ms) : null
  try {
    return await run(controller.signal)
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function withTimeout(promise, ms) {
  if (!ms) return promise
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('branding sync timed out')), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Whether `file` is there — the promise-API stand-in for existsSync. */
async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch (error) {
    return false
  }
}

// Write via a temp file + rename so a half-transferred archive is never discoverable: readers only
// ever see a complete file, and rename is atomic within the same directory.
//
// The promise API, not the *Sync one: the TTL refresh runs unawaited BESIDE the request that kicked
// it off ("no request pays for it"), and a sync write would stall the single event loop — and with it
// every request in flight — for as long as the archive takes to hit the disk. Atomicity is unaffected:
// it comes from the rename, not from the write being synchronous.
async function writeAtomic(target, buffer) {
  const tmp = `${target}.${process.pid}.tmp`
  await fs.writeFile(tmp, buffer)
  await fs.rename(tmp, target)
}

async function fetchArchive(base, dir, id) {
  const headers = {}
  const known = etags.get(id)
  const target = path.join(dir, `${id}.tar.gz`)
  // Only send the validator when the file it describes is actually still there — otherwise a deleted
  // cache file plus a stale ETag would yield 304 and leave the brand missing.
  if (known && (await exists(target))) headers['if-none-match'] = known

  const buffer = await withRequestTimeout(async (signal) => {
    const res = await fetch(`${base}/branding/archives/${encodeURIComponent(id)}`, {
      headers,
      signal,
    })
    if (res.status === 304) return null
    if (!res.ok) throw new Error(`archive ${id}: HTTP ${res.status}`)

    // Read the body INSIDE the bound: a response whose headers arrived promptly can still stall.
    const body = Buffer.from(await res.arrayBuffer())
    const etag = res.headers.get('etag')
    if (etag) etags.set(id, etag)
    else etags.delete(id)
    return body
  })
  if (!buffer) return 'unchanged'

  await writeAtomic(target, buffer)
  await evictShadowingArchives(dir, id, target)
  return 'updated'
}

// A brand baked into this image lands as BOTH `<id>.tar.gz` and `<id>-<version>.tar.gz`. Discovery
// keeps ONE archive per id — the highest version, and on a TIE the first file walked. Since a rebuilt
// brand usually keeps its version, the stale baked sibling can therefore out-rank what we just synced
// and the backend's copy would silently never take effect. Once a brand has been fetched, the baked
// duplicate is redundant, so drop whatever else still claims that id.
//
// discoverArchives is deliberately still SYNCHRONOUS here — it is the same call every downstream
// reader (assets middleware, SSR plugin, brandingHtml) makes, mtime-cached in the package, and making
// only this one caller async would buy nothing while forking the read path.
async function evictShadowingArchives(dir, id, target) {
  for (let guard = 0; guard < 8; guard++) {
    let winner
    try {
      const found = discoverArchives(dir).get(id)
      winner = found && found.file
    } catch (error) {
      return
    }
    if (!winner || path.resolve(winner) === path.resolve(target)) return
    try {
      await fs.unlink(winner)
    } catch (error) {
      // Read-only layer or already gone — nothing more we can do; discovery keeps its current winner.
      // eslint-disable-next-line no-console
      console.warn(`[branding] cannot evict shadowing archive ${winner}:`, error && error.message)
      return
    }
  }
}

// Mirror the backend's DEFAULT marker. Brand resolution ends at this file (activeBranding policy →
// $OCELOT_ACTIVE_BRANDING → DEFAULT → vanilla), so without it a deployment that never switched brands
// would hold every archive and still render unbranded. Mirrored exactly: no default on the backend
// means the local marker is removed, not left to go stale.
async function writeDefaultMarker(dir, id) {
  const target = path.join(dir, 'DEFAULT')
  if (isValidBrandId(id)) {
    await writeAtomic(target, Buffer.from(`${id}\n`, 'utf8'))
    return
  }
  try {
    await fs.unlink(target)
  } catch (error) {
    // Nothing to clear (the common case) — only a real failure is worth a word.
    if (error && error.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.warn('[branding] cannot clear the DEFAULT marker:', error.message)
    }
  }
}

async function sync(dir) {
  const base = backendUrl()
  const manifest = await withRequestTimeout(async (signal) => {
    const res = await fetch(`${base}/branding/manifest.json`, { signal })
    if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`)
    return res.json()
  })
  if (!manifest || !Array.isArray(manifest.brands)) throw new Error('manifest: no brands array')

  await fs.mkdir(dir, { recursive: true })
  // A malformed id would become a file name — reject it rather than sanitising, the backend derives
  // ids from its own archives and never legitimately produces one outside this set.
  const ids = manifest.brands.map((entry) => entry && entry.id).filter(isValidBrandId)
  await writeDefaultMarker(dir, manifest.default)

  const results = await Promise.allSettled(ids.map((id) => fetchArchive(base, dir, id)))
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length) {
    // Partial success is still progress — the brands that arrived are usable. Report the rest.
    // eslint-disable-next-line no-console
    console.warn(
      `[branding] ${failed.length}/${ids.length} archive(s) failed to sync:`,
      failed.map((r) => r.reason && r.reason.message).join(', '),
    )
  }
  return ids.length
}

// One sync at a time; concurrent callers await the same promise.
function runSync(dir) {
  if (inFlight) return inFlight
  inFlight = sync(dir)
    .then((count) => {
      lastSync = Date.now()
      return count
    })
    .catch((error) => {
      // Never fatal: the request proceeds against whatever the cache dir already holds.
      // eslint-disable-next-line no-console
      console.warn('[branding] sync from backend failed:', error && error.message)
      // Retry on the next request rather than waiting out the full TTL after a failure.
      lastSync = 0
      return 0
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

module.exports = async function brandingSync(req, res, next) {
  const dir = process.env.OCELOT_BRANDING_ASSETS_DIR
  // No cache dir configured → nothing to mirror into; the app runs on framework defaults.
  if (!dir) return next()

  try {
    if (!lastSync && !bootBlockSpent) {
      // First request after boot: block, but bounded — a dead backend falls through to the baked
      // archive (if any) instead of hanging the render.
      await withTimeout(runSync(dir), timeoutMs())
      // `>=`, not `>`: a TTL of 0 must mean "revalidate on every request", which `>` would turn into
      // "never" whenever two requests land in the same millisecond.
    } else if (Date.now() - lastSync >= ttlMs()) {
      // Warm — or booting with the block already spent: refresh in the background so no request pays
      // for it. An admin's brand switch is picked up within the TTL without a restart. Deliberately
      // not awaited — runSync catches internally, so this promise never rejects.
      runSync(dir)
    }
  } catch (error) {
    // withTimeout rejected. The block is a ONE-SHOT: this deployment has just demonstrated it cannot
    // deliver within the bound, and charging every later visitor the same wait would turn a slow
    // backend into a slow site. The sync keeps running in the background and lands for a later
    // request; until then the render uses whatever the cache dir already holds.
    bootBlockSpent = true
    // eslint-disable-next-line no-console
    console.warn('[branding] sync not ready:', error && error.message)
  }
  return next()
}

// Exposed for the tests; not part of the middleware contract.
module.exports._reset = () => {
  etags.clear()
  lastSync = 0
  inFlight = null
  bootBlockSpent = false
}
/** Await the background refresh a warm request kicked off (no-op when none is running). */
module.exports._flush = () => inFlight || Promise.resolve()
