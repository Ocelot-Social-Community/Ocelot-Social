/* eslint-disable no-catch-all/no-catch-all */ // a broken assets dir degrades to "no brands", never a 500
// Read-only HTTP access to the brand archives this backend has on disk, so the webapp no longer needs
// its own copy: the archive is deployed ONCE (baked into the backend image, or mounted into
// $OCELOT_BRANDING_ASSETS_DIR) and every other service acquires it from here.
//
//   GET /branding/manifest.json   → { default, brands } — the brands actually present, DERIVED from
//                                   discovery (never lists a brand whose archive is missing, never
//                                   misses one that is present), plus this deployment's baked default
//   GET /branding/archives/<id>   → that brand's raw `<id>.tar.gz`
//
// `default` matters as much as the archives: a client resolves its brand as activeBranding policy →
// $OCELOT_ACTIVE_BRANDING → the DEFAULT marker → vanilla. Without the marker a deployment that never
// switched brands would hold every archive and still render unbranded.
//
// Public and unauthenticated by design: branding is what every visitor sees anyway, and the webapp
// fetches it during SSR where no user context exists. Nothing here reads a caller-supplied path — the
// id is looked up as a Map KEY in the discovered set, so traversal cannot reach outside the archives.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

import {
  discoverArchives as discoverArchivesFromDisk,
  isValidBrandId,
  readDefaultMarker as readDefaultMarkerFromDisk,
} from '@ocelot-social/branding/dist/discover.js'
import { Router } from 'express'

import type { BrandArchive } from '@ocelot-social/branding/dist/discover.js'
import type { Request, Response } from 'express'

/**
 * The two disk readers this router is built on. Injectable so a test can hand in fakes DIRECTLY
 * instead of mocking the package subpath: `@ocelot-social/branding/dist/discover.js` is a subpath of a
 * `file:` dependency, and whether jest binds a mock of it to this module turned out to depend on the
 * environment — green locally, silently ignored in the CI container, where the router then read the
 * real filesystem and every fixture-based assertion failed. Production passes nothing and keeps the
 * real readers.
 */
export interface BrandingRouterDeps {
  discoverArchives: typeof discoverArchivesFromDisk
  readDefaultMarker: typeof readDefaultMarkerFromDisk
}

/**
 * Router for the brand archives under `assetsDir`.
 *
 * `assetsDir` undefined/empty (a vanilla deployment) still serves the manifest — as an EMPTY one. An
 * unbranded backend and a backend with zero archives are the same thing to a client, so they get the
 * same answer rather than one of them getting no answer at all.
 *
 * This mount is TERMINAL: nothing under /branding may fall through. Apollo is mounted at '/' behind it
 * (see server.ts), so a fall-through does not 404 — it reaches the GraphQL handler, which rejects the
 * path as an operation without a query and logs a BAD_REQUEST error. That turned the webapp's routine
 * manifest poll on a vanilla deployment into a stream of GraphQL errors, and made the webapp treat a
 * successful "no brands" answer as a failed sync (HTTP 400 → retry on the next request, forever).
 *
 * `assetsDir` is passed in, never defaulted from $OCELOT_BRANDING_ASSETS_DIR here: the image sets that
 * variable, so a default would make the router — and every test of it — depend on the ambient
 * environment rather than on its argument. server.ts reads the env once and hands it over. `deps`
 * follows the same principle for the disk readers (see BrandingRouterDeps).
 */
export function brandingRouter(
  assetsDir: string | undefined,
  deps: Partial<BrandingRouterDeps> = {},
): Router {
  const {
    discoverArchives = discoverArchivesFromDisk,
    readDefaultMarker = readDefaultMarkerFromDisk,
  } = deps
  const router = Router()
  const dir = assetsDir

  /** The archive of `id`, or undefined when it is unknown or the assets dir is unreadable. */
  const findArchive = (assetsDirectory: string, id: string): BrandArchive | undefined => {
    try {
      return discoverArchives(assetsDirectory).get(id)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[branding] cannot read ${assetsDirectory}:`, error)
      return undefined
    }
  }

  router.get('/manifest.json', (_req: Request, res: Response) => {
    // No assets dir configured → a vanilla deployment, which HAS no brands: the empty answer below is
    // the correct one, and nothing is read from disk.
    let archives: BrandArchive[] = []
    if (dir) {
      try {
        archives = [...discoverArchives(dir).values()]
      } catch (error) {
        // A broken assets dir must not take the backend down — report "no brands" and let the caller
        // fall back to whatever it already has.
        // eslint-disable-next-line no-console
        console.warn(`[branding] cannot read ${dir}:`, error)
        // Same shape as the success case, so a client parses one contract rather than two.
        res.status(503).json({ default: '', brands: [] })
        return
      }
    }
    // The baked default of THIS deployment. Empty when no brand was baked in — a client then falls
    // through to its own env pin or to vanilla, exactly as it would without a marker on disk.
    let defaultId = ''
    try {
      defaultId = dir ? readDefaultMarker(dir) : ''
    } catch {
      defaultId = ''
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // The set changes when an archive is added/removed; clients revalidate rather than cache it.
    res.setHeader('Cache-Control', 'no-cache')
    res.end(
      JSON.stringify({
        default: defaultId,
        brands: archives.map(({ id, label, version, schemaVersion }) => ({
          id,
          label,
          version,
          schemaVersion,
        })),
      }),
    )
  })

  // express 4 handlers must return void, so the async body is a named function the route only kicks
  // off; every failure path inside it answers the request itself.
  async function sendArchive(req: Request, res: Response): Promise<void> {
    const requested = req.params.id
    if (!isValidBrandId(requested)) {
      res.status(400).end()
      return
    }

    // The EXACT id first. `<id>.tar.gz` is only an alias — the archives are named that way on disk, so
    // the suffix is accepted for convenience — but a brand id may legitimately contain dots (this
    // network runs `stage.ocelot.social`), so one that ends in `.tar.gz` must not be silently rewritten
    // into a different brand's id. Only when nothing is deployed under the exact id does the alias
    // apply. Without an assets dir nothing is deployed at all, so every id is unknown.
    const lookUp = (candidate: string): BrandArchive | undefined =>
      dir ? findArchive(dir, candidate) : undefined
    const archive =
      lookUp(requested) ??
      (requested.endsWith('.tar.gz') ? lookUp(requested.slice(0, -'.tar.gz'.length)) : undefined)
    if (!archive) {
      res.status(404).end()
      return
    }

    // Weak validator from the file's identity, so a client can revalidate cheaply and skip the
    // transfer while the archive is unchanged. Version alone would not do: rebuilding a brand without
    // bumping its version (the common case during a rollout) must still invalidate.
    let etag: string
    try {
      // Not caller-supplied: the path comes from discovery under `dir`, reached only via an exact
      // Map-key lookup. The RESOLVED brand names the validator, so both spellings of the same archive
      // share one ETag instead of revalidating against each other.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const { size, mtimeMs } = await stat(archive.file)
      etag = `W/"${archive.id}-${String(size)}-${String(Math.floor(mtimeMs))}"`
    } catch {
      // Discovered a moment ago but gone now — treat exactly like an unknown brand.
      res.status(404).end()
      return
    }
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end()
      return
    }

    res.setHeader('Content-Type', 'application/gzip')
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'no-cache')
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    // Streamed: an archive is small (tens of KB) but this keeps it off the heap and lets express
    // handle backpressure.
    //
    // pipeline(), not .pipe(): pipe only tears down the DESTINATION. A client that aborts mid-transfer
    // (or a read that fails) would leave the file descriptor open until the read finishes on its own —
    // one leaked fd per aborted download, on an endpoint anyone can call. pipeline destroys both ends.
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- same discovered path as above
      await pipeline(createReadStream(archive.file), res)
    } catch {
      // The headers are already out, so there is nothing left to tell the client. pipeline has torn
      // both ends down; destroying the response is the only way to end a half-sent body.
      res.destroy()
    }
  }

  router.get('/archives/:id', (req: Request, res: Response) => {
    void sendArchive(req, res)
  })

  // Terminal, for the reason in the header: an unmatched /branding path must 404 HERE. Handing it on
  // means handing it to the GraphQL middleware at '/', which reports it as a malformed operation.
  router.use((_req: Request, res: Response) => {
    res.status(404).end()
  })

  return router
}
