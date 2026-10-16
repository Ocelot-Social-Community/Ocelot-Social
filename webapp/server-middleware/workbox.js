// Workbox, served from our own origin (#5761). @nuxtjs/pwa's service worker would otherwise load it
// from cdn.jsdelivr.net — every visitor's browser asking a third party. The files are read straight
// out of `workbox-cdn` in node_modules, so nothing is copied into the build or the source tree:
//
//   /workbox/<version>/<file> → node_modules/workbox-cdn/workbox/<file>
//
// `workbox-cdn` is @nuxtjs/pwa's own dependency and is resolved THROUGH it, so what we serve is the
// version the generated sw.js was written against (pwa's `workboxVersion` is read from the same
// package). The version is part of the URL, which makes every file immutable: a pwa upgrade changes
// the URL, never the content behind one — hence the long-lived cache below. nuxt.config.js builds
// `pwa.workbox.workboxURL` and `modulePathPrefix` from the exported `urlPrefix`.
const fs = require('fs')
const path = require('path')

const pwaDir = path.dirname(require.resolve('@nuxtjs/pwa/package.json'))
const packageJson = require.resolve('workbox-cdn/package.json', { paths: [pwaDir] })
const { version } = require(packageJson)
const dir = path.join(path.dirname(packageJson), 'workbox')

const CONTENT_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
}

function workbox(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  // Registered at path '/workbox', so req.url is prefix-stripped: '/<version>/<file>'.
  const [urlVersion, file, ...rest] = (req.url || '').split('?')[0].replace(/^\/+/, '').split('/')
  // A plain file name of this version's directory, nothing else: an older version's URL (a cached
  // sw.js from before an upgrade) falls through rather than being answered with different code.
  if (urlVersion !== version || rest.length || !file || file.startsWith('.')) return next()
  const type = CONTENT_TYPES[path.extname(file)]
  if (!type) return next()

  fs.readFile(path.join(dir, file), (error, data) => {
    if (error) return next()
    res.setHeader('Content-Type', type)
    res.setHeader('Content-Length', data.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    if (req.method === 'HEAD') return res.end()
    res.end(data)
  })
}

module.exports = workbox
module.exports.urlPrefix = `/workbox/${version}`
