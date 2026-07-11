// Dynamic branding-asset server: serves /branding/* from $OCELOT_BRANDING_ASSETS_DIR at runtime,
// reading every brand file FROM its archive so nothing is copied into the image — mount a volume /
// configMap of archives and the running webapp picks them up. The directory layout is what
// packages/branding/scripts/build-brandings.mjs writes:
//
//   $OCELOT_BRANDING_ASSETS_DIR/
//     manifest.json     → /branding/manifest.json                (loose index)
//     <id>.tar.gz       → /branding/<id>/…  (branding.json + assets/ + html/, read from the archive)
//
// A brand's `<id>.tar.gz` is loaded + decompressed once and cached (re-read only when its mtime
// changes). Env unset → next() (no dynamic brandings; the app runs on framework defaults).
const fs = require('fs')
const path = require('path')
// eslint-disable-next-line import/no-unresolved -- package subpath, server-only (uses node:zlib)
const { readTarGz } = require('@ocelot-social/branding/dist/tar.js')

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

// id → { mtimeMs, files: Map<entryPath, Buffer> }
const archiveCache = new Map()

function loadArchive(baseDir, id) {
  const file = path.join(baseDir, `${id}.tar.gz`)
  let stat
  try {
    stat = fs.statSync(file)
  } catch (error) {
    return null
  }
  const cached = archiveCache.get(id)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.files
  const files = readTarGz(fs.readFileSync(file))
  archiveCache.set(id, { mtimeMs: stat.mtimeMs, files })
  return files
}

module.exports = function brandingAssets(req, res, next) {
  const baseDir = process.env.OCELOT_BRANDING_ASSETS_DIR
  if (!baseDir) return next()
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  // Registered at path '/branding', so req.url is prefix-stripped: '/manifest.json' or
  // '/<id>/assets/logo.svg'. Normalise to 'manifest.json' / '<id>/assets/logo.svg'.
  const urlPath = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '')
  const base = path.resolve(baseDir)

  // The manifest is a loose file (the index of available archives).
  if (urlPath === 'manifest.json') {
    let data
    try {
      data = fs.readFileSync(path.join(base, 'manifest.json'))
    } catch (error) {
      return next()
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    if (req.method === 'HEAD') return res.end()
    return res.end(data)
  }

  // Everything else is <id>/<entry>, read from <id>.tar.gz.
  const slash = urlPath.indexOf('/')
  if (slash === -1) return next()
  const id = urlPath.slice(0, slash)
  const entry = urlPath.slice(slash + 1)
  // Guard the brand id (the entry lookup is a Map key, so path traversal cannot escape the archive).
  if (!/^[a-z0-9._-]+$/i.test(id)) return next()

  const files = loadArchive(base, id)
  if (!files) return next()
  const data = files.get(entry)
  if (!data) return next()

  const type = CONTENT_TYPES[path.extname(entry).toLowerCase()] || 'application/octet-stream'
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', data.length)
  // Keep the compiled config fresh (a switch is picked up); assets are namespaced + safe to cache.
  res.setHeader('Cache-Control', entry === 'branding.json' ? 'no-cache' : 'public, max-age=3600')
  if (req.method === 'HEAD') return res.end()
  res.end(data)
}
