// Dynamic branding-asset server: serves /branding/* from $OCELOT_BRANDING_ASSETS_DIR at runtime,
// so a brand's assets (logos, favicon, static-page HTML, CSS, fonts) and its compiled config
// (branding.json) + the manifest.json are bound WITHOUT being copied into the image — mount a
// volume / configMap and the running webapp picks them up. The directory layout mirrors what
// packages/branding/scripts/build-brandings.mjs writes:
//
//   $OCELOT_BRANDING_ASSETS_DIR/
//     manifest.json          → /branding/manifest.json
//     <id>/branding.json     → /branding/<id>/branding.json
//     <id>/assets/…          → /branding/<id>/assets/…
//     <id>/html/<locale>/…   → /branding/<id>/html/<locale>/…
//
// Env unset → next() (no dynamic brandings; the app runs on framework defaults / baked static).
const fs = require('fs')
const path = require('path')

// Registered in nuxt.config with `path: '/branding'`, so req.url here is already prefix-stripped
// (e.g. '/stage/assets/logo-horizontal.svg', '/manifest.json').
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
  const baseDir = process.env.OCELOT_BRANDING_ASSETS_DIR
  if (!baseDir) return next()

  // Only GET/HEAD; anything else is not ours.
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  const urlPath = decodeURIComponent((req.url || '').split('?')[0])
  const base = path.resolve(baseDir)
  const filePath = path.resolve(base, `.${urlPath}`)

  // Path-traversal guard: the resolved path must stay inside the served base dir.
  if (filePath !== base && !filePath.startsWith(base + path.sep)) {
    res.statusCode = 403
    return res.end('Forbidden')
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return next() // not a branding asset → let Nuxt handle it (404 etc.)

    const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    res.setHeader('Content-Type', type)
    res.setHeader('Content-Length', stat.size)
    // Assets are namespaced per brand + rebuilt on deploy; safe to cache, but keep the config and
    // manifest fresh so a brand switch is picked up.
    const cacheable = !/(^|\/)(branding|manifest)\.json$/.test(urlPath)
    res.setHeader('Cache-Control', cacheable ? 'public, max-age=3600' : 'no-cache')

    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(filePath).pipe(res)
  })
}
