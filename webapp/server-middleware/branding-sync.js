// Acquire the brand archives from the BACKEND instead of shipping them in this image: the backend
// serves what it has on disk (GET /branding/manifest.json + /branding/archives/<id>, see
// backend/src/branding/routes.ts) and this middleware mirrors them into $OCELOT_BRANDING_CACHE_DIR.
//
// Everything downstream is unchanged and SYNCHRONOUS — the branding-assets middleware, the SSR
// branding plugin and brandingHtml keep reading `*.tar.gz` off disk. That is the whole point of
// mirroring to a file instead of holding the archives in memory: one deployed copy (the backend's),
// no async rewrite of every consumer.
//
// TWO DIRECTORIES, ONE OWNER. $OCELOT_BRANDING_ASSETS_DIR is the ordered READ search path (see
// src/discover.ts); $OCELOT_BRANDING_CACHE_DIR is the single directory this middleware WRITES, and it
// owns that directory exclusively — it overwrites and removes files there. Put it on the search path
// (ahead of the baked archives, so a synced brand out-ranks them) but do NOT point it at a directory
// anything else writes: a brand's build output, a read-only mount of archives, or the image's baked
// `branding-assets`. It defaults to the FIRST root of the search path, which is right when that root
// is a dedicated cache and wrong the moment it is shared.
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
const {
  discoverArchives,
  isValidBrandId,
  resolveRoots,
} = require('@ocelot-social/branding/dist/discover.js')

// A mistyped bound must not silently disable what it configures: `Number('2s')` is NaN and a negative
// value is just as meaningless, and both would collapse to 0 — "revalidate on every request" for the
// TTL, "abort immediately" for the timeout. Anything that is not a finite, non-negative number falls
// back to the default; 0 itself stays meaningful (no TTL / no bound) and is passed through.
// Duplicated in plugins/branding.js rather than shared: this file is loaded by Node as CommonJS
// serverMiddleware, the plugin is bundled by webpack for both server and client.
function boundMs(raw, fallback) {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

// Read per call, not at module load: the webapp's server middleware is loaded once per process, and
// capturing the env here would freeze whatever was set at import time.
// How long a completed sync is trusted before the next request triggers a background refresh.
const ttlMs = () => boundMs(process.env.OCELOT_BRANDING_SYNC_TTL_MS, 60_000)
// Two bounds, one knob. It caps (a) the FIRST (blocking) sync, so a slow or dead backend cannot hold
// the first page render, and (b) every INDIVIDUAL backend request, so a socket that opens and then
// goes quiet cannot pin the sync forever. Both are needed: (a) alone only stops the WAITING — the
// request underneath keeps hanging, and since it stays the in-flight sync every later request would
// queue behind the same dead socket. Node's fetch has no timeout of its own.
const timeoutMs = () => boundMs(process.env.OCELOT_BRANDING_SYNC_TIMEOUT_MS, 5_000)

// id → ETag of the archive currently on disk, so a refresh transfers nothing while it is unchanged.
const etags = new Map()
let lastSync = 0
let inFlight = null
// Whether the one blocking boot attempt has been spent (see the middleware).
let bootBlockSpent = false
// Ids already reported as shadowed, and whether the "cache is off the search path" note has been made
// — both are configuration faults that would otherwise repeat on every refresh.
const shadowWarned = new Set()
let offPathWarned = false

/**
 * The directory this middleware writes into. Explicit via $OCELOT_BRANDING_CACHE_DIR; otherwise the
 * FIRST root of the read search path, which keeps a single-directory deployment working unchanged.
 * '' (no directory at all) → nothing to mirror into.
 */
function cacheDir() {
  const explicit = resolveRoots(process.env.OCELOT_BRANDING_CACHE_DIR)[0]
  if (explicit) return explicit
  return resolveRoots(process.env.OCELOT_BRANDING_ASSETS_DIR)[0] || ''
}

// A cache that is not on the read search path is written and never read — the sync appears to work
// (files land, no error) while the app keeps rendering whatever it had. Say so once.
function warnIfOffSearchPath(dir) {
  if (offPathWarned) return
  const roots = resolveRoots(process.env.OCELOT_BRANDING_ASSETS_DIR)
  if (roots.includes(dir)) return
  offPathWarned = true
  // eslint-disable-next-line no-console
  console.warn(
    `[branding] the sync cache ${dir} is not on $OCELOT_BRANDING_ASSETS_DIR (${roots.join(path.delimiter) || 'unset'}) — mirrored archives will never be read. Add it to the search path, ahead of any baked archives.`,
  )
}

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
  reportIfShadowedInCache(dir, id, target)
  return 'updated'
}

// Whether the copy just written is the one discovery will actually serve. It normally is: within a
// root the highest version wins and `<id>.tar.gz` — the name written here — beats a same-version
// `<id>-<version>.tar.gz` sibling (see discover.ts `outranks`). What can still lose is a file in the
// CACHE DIRECTORY carrying a HIGHER version, which only happens when the cache is shared with
// something that publishes there — the directory contract this middleware relies on, broken.
//
// This used to DELETE the offender. It no longer does: the cache is the only thing this middleware
// owns, and when the loser is someone else's file (a brand's build output, a mounted archive) deleting
// it destroys data to fix a lookup. Precedence is settled by the search path now; all that is left
// here is to name a misconfiguration that would otherwise be invisible.
//
// Scoped to the cache dir alone, NOT the whole search path: an archive in another root out-ranking
// this one is the documented precedence rule (a developer's freshly built brand beating the cache),
// not a fault, and must stay silent.
//
// discoverArchives is deliberately SYNCHRONOUS here — the same call every downstream reader (assets
// middleware, SSR plugin, brandingHtml) makes, mtime-cached in the package.
function reportIfShadowedInCache(dir, id, target) {
  if (shadowWarned.has(id)) return
  let winner
  try {
    const found = discoverArchives(dir).get(id)
    winner = found && found.file
  } catch (error) {
    return
  }
  if (!winner || path.resolve(winner) === path.resolve(target)) return
  shadowWarned.add(id)
  // eslint-disable-next-line no-console
  console.warn(
    `[branding] ${winner} shadows the synced ${target} inside the cache dir — the backend's "${id}" will not be served. The cache must not be shared with baked or published archives; point $OCELOT_BRANDING_CACHE_DIR at a directory of its own.`,
  )
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
  warnIfOffSearchPath(dir)
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
  const dir = cacheDir()
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
  shadowWarned.clear()
  offPathWarned = false
}
/** Await the background refresh a warm request kicked off (no-op when none is running). */
module.exports._flush = () => inFlight || Promise.resolve()
