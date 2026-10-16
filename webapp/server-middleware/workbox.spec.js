const fs = require('fs')
const path = require('path')
const workbox = require('./workbox.js')

const pwaDir = path.dirname(require.resolve('@nuxtjs/pwa/package.json'))
const cdnDir = path.dirname(require.resolve('workbox-cdn/package.json', { paths: [pwaDir] }))
const { version } = require(path.join(cdnDir, 'package.json'))

// Resolves once the middleware has answered or passed on — reading the file is asynchronous.
function run(url, method = 'GET') {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value
      },
      end(body) {
        this.body = body
        resolve({ res, next })
      },
    }
    const next = jest.fn(() => resolve({ res, next }))
    workbox({ url, method }, res, next)
  })
}

describe('workbox serverMiddleware', () => {
  it('builds its URL prefix from the version of the workbox-cdn @nuxtjs/pwa depends on', () => {
    expect(workbox.urlPrefix).toBe(`/workbox/${version}`)
  })

  it.each([
    ['workbox-sw.js'],
    ['workbox-core.prod.js'],
    ['workbox-precaching.dev.js'],
    ['workbox-window.prod.mjs'],
  ])('serves %s from workbox-cdn', async (file) => {
    const { res, next } = await run(`/${version}/${file}`)

    expect(next).not.toHaveBeenCalled()
    expect(res.body).toEqual(fs.readFileSync(path.join(cdnDir, 'workbox', file)))
    expect(res.headers['Content-Type']).toBe('text/javascript; charset=utf-8')
    expect(res.headers['Content-Length']).toBe(res.body.length)
    // The version is in the URL, so the content behind it never changes.
    expect(res.headers['Cache-Control']).toBe('public, max-age=31536000, immutable')
  })

  it('ignores the query string', async () => {
    const { next } = await run(`/${version}/workbox-sw.js?v=1`)

    expect(next).not.toHaveBeenCalled()
  })

  it('answers HEAD with the headers only', async () => {
    const { res, next } = await run(`/${version}/workbox-sw.js`, 'HEAD')

    expect(next).not.toHaveBeenCalled()
    expect(res.headers['Content-Length']).toBeGreaterThan(0)
    expect(res.body).toBeUndefined()
  })

  it.each([
    ['another method', `/${version}/workbox-sw.js`, 'POST'],
    // A service worker cached from before a pwa upgrade must not get code of a different version.
    ['another version', '/0.0.1/workbox-sw.js', 'GET'],
    ['no file', `/${version}/`, 'GET'],
    ['no version', '/workbox-sw.js', 'GET'],
    ['a file that does not exist', `/${version}/workbox-nothing.prod.js`, 'GET'],
    ['a file that is not a script', `/${version}/package.json`, 'GET'],
    ['a nested path', `/${version}/sub/workbox-sw.js`, 'GET'],
    ['a path out of the directory', `/${version}/../package.json`, 'GET'],
    ['an encoded path out of the directory', `/${version}/..%2Fworkbox%2Fworkbox-sw.js`, 'GET'],
    ['a dot file', `/${version}/.js`, 'GET'],
    ['no url at all', undefined, 'GET'],
  ])('passes on %s', async (_, url, method) => {
    const { res, next } = await run(url, method)

    expect(next).toHaveBeenCalled()
    expect(res.body).toBeUndefined()
  })
})
