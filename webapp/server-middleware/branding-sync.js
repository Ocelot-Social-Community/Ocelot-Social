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
// owns that directory exclusively — it overwrites and removes files there. Neither needs setting:
// both have defaults (`.branding-cache` next to the process, the conventional archive locations),
// and the cache is always the FIRST root of the read path without being part of it, because it holds
// the freshest copy of the source of truth. What must NOT happen is pointing the cache at a directory
// something else writes — a brand's build output, a read-only mount, the image's baked archive.
//
// The local copy is a CACHE, never the source of truth. It is rebuilt from the backend on boot and
// refreshed on a TTL; if the backend is unreachable, whatever is already on disk stays valid (a baked
// image archive, or the previous sync) so a backend blip cannot un-brand the webapp.
//
// Registered FIRST in nuxt.config.js `serverMiddleware`, so the initial sync completes before the
// branding-assets middleware or SSR read the directory.
const fs = require('fs').promises
const path = require('path')

// Package subpath, server-only (uses node:fs).
const {
  cacheDir: resolveCacheDir,
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
// Ids already reported as shadowed — a standing configuration fault that would otherwise be reprinted
// on every refresh.
const shadowWarned = new Set()
// Same reason: a mistyped cache dir is a standing fault, and this runs per request.
let multiPathWarned = false

/** The directory this middleware writes into: $OCELOT_BRANDING_CACHE_DIR, else the package default. */
function cacheDir() {
  const configured = process.env.OCELOT_BRANDING_CACHE_DIR
  // The cache has ONE destination, so resolveCacheDir keeps only the first entry. Its neighbour
  // $OCELOT_BRANDING_ASSETS_DIR *is* a `:`-separated search path, which makes pasting a multi-path
  // value in here easy — and silently half-effective. Say it once rather than let the extra paths
  // look configured.
  if (!multiPathWarned && resolveRoots(configured).length > 1) {
    multiPathWarned = true
    // eslint-disable-next-line no-console
    console.warn(
      `[branding] $OCELOT_BRANDING_CACHE_DIR is one directory, not a search path — using ${resolveCacheDir(configured)} and ignoring the rest of "${configured}".`,
    )
  }
  return resolveCacheDir(configured)
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

// Drop archives for brands the backend no longer lists. The cache is a MIRROR, so a brand deleted
// there has to vanish here too — otherwise discovery keeps finding it, and it stays in the admin's
// brand list and stays selectable for the whole life of the pod.
//
// Identified by the archive's OWN id, not by its filename: the only file this middleware writes for a
// brand is `<id>.tar.gz` in the cache root, so an archive found under any other name — a versioned
// `<id>-<version>.tar.gz` (what publishBrandArchive calls immutable history), a copy in a
// subdirectory — is not ours to delete. Matching on the name alone would read `stage-1.0.0.tar.gz` as
// the brand `stage-1.0.0` and remove it, which is the eviction this replaced, back by another route.
//
// discoverArchives also settles the malformed cases for free: a file that is not a readable archive
// (`..evil.tar.gz`, a truncated download) carries no id and is never a candidate.
async function removeOrphans(dir, ids) {
  const listed = new Set(ids)
  let discovered
  try {
    discovered = discoverArchives(dir)
  } catch (error) {
    return // unreadable cache: the sync already did its work, this is only tidying
  }
  for (const [id, archive] of discovered) {
    if (listed.has(id)) continue
    const ours = path.join(dir, `${id}.tar.gz`)
    if (path.resolve(archive.file) !== path.resolve(ours)) continue
    try {
      await fs.unlink(ours)
      // Forget the validator too, or a brand that comes BACK would be revalidated against the ETag of
      // a file that is no longer there — a 304 with nothing on disk.
      etags.delete(id)
      // eslint-disable-next-line no-console
      console.warn(`[branding] dropped ${id}.tar.gz: the backend no longer lists that brand`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[branding] cannot drop the orphaned ${id}.tar.gz:`, error && error.message)
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

  // A malformed id would become a file name — reject it rather than sanitising, the backend derives
  // ids from its own archives and never legitimately produces one outside this set.
  const ids = manifest.brands.map((entry) => entry && entry.id).filter(isValidBrandId)
  // Nothing to mirror AND nothing mirrored before → don't create the directory at all. The sync needs
  // no configuration to run, so a VANILLA deployment reaches this point on every boot and would
  // otherwise be left with an empty cache directory it never asked for. Guarded on the directory
  // EXISTING rather than on the empty manifest alone: once there is a cache, an empty manifest means
  // "the brands were removed" and has to be mirrored like any other change (the marker is cleared).
  if (!ids.length && !isValidBrandId(manifest.default) && !(await exists(dir))) return 0
  await fs.mkdir(dir, { recursive: true })
  await writeDefaultMarker(dir, manifest.default)

  const results = await Promise.allSettled(ids.map((id) => fetchArchive(base, dir, id)))
  // AFTER fetching, not before: the new state is on disk first, so a transfer that fails cannot leave
  // the cache emptier than it started.
  await removeOrphans(dir, ids)
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
  // Always a directory (the package supplies the default), so the sync runs unconfigured — a vanilla
  // backend simply answers "no brands" and nothing is written. Branding is opt-OUT, not opt-in.
  const dir = cacheDir()

  try {
    if (!lastSync && !bootBlockSpent) {
      // First request after boot: block, but bounded — a dead backend falls through to the baked
      // archive (if any) instead of hanging the render.
      await withTimeout(runSync(dir), timeoutMs())
      // `>=`, not `>`: a TTL of 0 must mean "revalidate on every request", which `>` would turn into
      // "never" whenever two requests land in the same millisecond.
    } else if (Date.now() - lastSync >= ttlMs()) {
      // Warm — or booting with the block already spent: refresh in the background so no request pays
      // for it. An admin's brand switch is therefore picked up without a restart — but on a LATER
      // request, not this one: the TTL says when to go looking, not when the result is in. Deliberately
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
  multiPathWarned = false
}
/** Await the background refresh a warm request kicked off (no-op when none is running). */
module.exports._flush = () => inFlight || Promise.resolve()
