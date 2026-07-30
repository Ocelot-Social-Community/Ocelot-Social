/* eslint-disable n/no-process-env */ // reads the branding env (like bootstrap.ts / config/index.ts)
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

import {
  discoverArchives,
  isValidBrandId,
  readDefaultMarker,
} from '@ocelot-social/branding/dist/discover.js'
import { Router } from 'express'

import type { BrandArchive } from '@ocelot-social/branding/dist/discover.js'
import type { Request, Response } from 'express'

/** The archive of `id`, or undefined when it is unknown or the assets dir is unreadable. */
function findArchive(assetsDir: string, id: string): BrandArchive | undefined {
  try {
    return discoverArchives(assetsDir).get(id)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[branding] cannot read ${assetsDir}:`, error)
    return undefined
  }
}

/**
 * Router for the brand archives under `assetsDir`.
 *
 * `assetsDir` undefined/empty (a vanilla deployment) yields an EMPTY router: the routes are not
 * registered at all, so the requests 404 through the normal chain instead of reporting an empty
 * manifest — an unbranded backend and a backend with zero archives are the same thing to a client.
 */
export function brandingRouter(
  assetsDir: string | undefined = process.env.OCELOT_BRANDING_ASSETS_DIR,
): Router {
  const router = Router()
  if (!assetsDir) return router
  const dir = assetsDir

  router.get('/manifest.json', (_req: Request, res: Response) => {
    let archives: BrandArchive[]
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
    // The baked default of THIS deployment. Empty when no brand was baked in — a client then falls
    // through to its own env pin or to vanilla, exactly as it would without a marker on disk.
    let defaultId = ''
    try {
      defaultId = readDefaultMarker(dir)
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
    const id = req.params.id.replace(/\.tar\.gz$/, '')
    if (!isValidBrandId(id)) {
      res.status(400).end()
      return
    }

    const archive = findArchive(dir, id)
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
      // Map-key lookup of `id`.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const { size, mtimeMs } = await stat(archive.file)
      etag = `W/"${id}-${String(size)}-${String(Math.floor(mtimeMs))}"`
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
    // handle backpressure. A read error after the headers are out can only be aborted.
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- same discovered path as above
    createReadStream(archive.file)
      .on('error', () => res.destroy())
      .pipe(res)
  }

  router.get('/archives/:id', (req: Request, res: Response) => {
    void sendArchive(req, res)
  })

  return router
}
