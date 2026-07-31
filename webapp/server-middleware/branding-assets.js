// Dynamic branding-asset server: serves /branding/* from the brand archives at runtime, reading every
// brand file FROM its archive so nothing is copied into the image — mount a volume / configMap of
// `<id>.tar.gz` archives and the running webapp picks them up. Archives are discovered RECURSIVELY
// under each root of the ordered search path (any `*.tar.gz`; see src/discover.ts), so a root may be a
// flat folder of archives OR the deployment/configurations tree (`<brand>/dist/<id>.tar.gz`), and an
// earlier root shadows a later one for the ids it provides:
//
//   /branding/manifest.json → DERIVED from the archives present (never lists a missing brand, never
//                             misses a present one); each brand id + label comes from its branding.json
//   /branding/<id>/<entry>  → read from that brand's archive
//
// Archives are decompressed once and cached (re-read only on mtime change). No archive under any root
// → next() for every path (no dynamic brandings; the app runs on framework defaults).
const path = require('path')
// eslint-disable-next-line import/no-unresolved -- package subpath, server-only (uses node:fs + node:zlib)
const {
  discoverArchives,
  readArchive,
  composeArchive,
  readDefaultMarker,
  isValidBrandId,
  cacheFirstSearchPath,
} = require('@ocelot-social/branding/dist/discover.js')

/** The roots this middleware serves from: the sync cache, then the baked/mounted archives. */
const roots = () =>
  cacheFirstSearchPath(
    process.env.OCELOT_BRANDING_CACHE_DIR,
    process.env.OCELOT_BRANDING_ASSETS_DIR,
  )

const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
}

module.exports = function brandingAssets(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  // Resolved per request, not once at module load: the env is read at RUNTIME (this file is loaded
  // by Node as CommonJS serverMiddleware) and there is always a search path — unset means the
  // conventional locations, not "no branding".
  const baseDir = roots()

  // Registered at path '/branding', so req.url is prefix-stripped: '/manifest.json' or
  // '/<id>/assets/logo.svg'. Normalise to 'manifest.json' / '<id>/assets/logo.svg'.
  const urlPath = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '')

  // The manifest is DERIVED from the archives actually discovered — so it can never list a brand
  // whose archive is missing (or miss one that is present).
  if (urlPath === 'manifest.json') {
    let manifest
    try {
      // `isDefault` marks this deployment's baked brand (the DEFAULT marker) — the admin list sorts it
      // first and labels it, so the fallback every unswitched visitor sees is identifiable. Kept as a
      // per-entry flag rather than a sibling field so the manifest stays a plain array.
      let defaultId = ''
      try {
        defaultId = readDefaultMarker(baseDir)
      } catch (error) {
        defaultId = ''
      }
      manifest = [...discoverArchives(baseDir).values()].map((a) => ({
        id: a.id,
        label: a.label,
        version: a.version,
        isDefault: a.id === defaultId,
        config: `/branding/${a.id}/branding.json`,
      }))
    } catch (error) {
      return next()
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    if (req.method === 'HEAD') return res.end()
    return res.end(JSON.stringify(manifest))
  }

  // Everything else is <id>/<entry>, read from that brand's archive.
  const slash = urlPath.indexOf('/')
  if (slash === -1) return next()
  const id = urlPath.slice(0, slash)
  const entry = urlPath.slice(slash + 1)
  // Guard the brand id (the entry lookup is a Map key, so path traversal cannot escape the archive).
  if (!isValidBrandId(id)) return next()

  const archive = discoverArchives(baseDir).get(id)
  if (!archive) return next()
  const files = readArchive(archive.file)
  if (!files) return next()

  // `branding.json` is VIRTUAL: the archive stores instance fragments, not a merged config, so compose
  // the effective config on the fly (the admin detail view fetches this). Everything else is a real
  // archive entry (asset / html / fragment).
  if (entry === 'branding.json') {
    const config = composeArchive(files)
    if (!config) return next()
    const body = JSON.stringify(config)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Length', Buffer.byteLength(body))
    res.setHeader('Cache-Control', 'no-cache') // a switch/edit is picked up
    if (req.method === 'HEAD') return res.end()
    return res.end(body)
  }

  const data = files.get(entry)
  if (!data) return next()

  const type = CONTENT_TYPES[path.extname(entry).toLowerCase()] || 'application/octet-stream'
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', data.length)
  // Assets are namespaced + safe to cache.
  res.setHeader('Cache-Control', 'public, max-age=3600')
  if (req.method === 'HEAD') return res.end()
  res.end(data)
}
