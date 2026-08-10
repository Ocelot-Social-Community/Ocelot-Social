const brandIcons = require('./brand-icons.js')
const { setBranding, brandingDefaults } = require('@ocelot-social/branding')

function run(url, method = 'GET') {
  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value
    },
    end() {
      this.ended = true
    },
  }
  const next = jest.fn()
  brandIcons({ url, method }, res, next)
  return { res, next }
}

const branded = (assets) =>
  setBranding({ ...brandingDefaults, assets: { ...brandingDefaults.assets, ...assets } })

describe('brand-icons serverMiddleware', () => {
  afterEach(() => setBranding(undefined)) // reset to framework defaults

  // The whole point: these paths are requested WITHOUT reading <head>, so the branded <link> tags
  // never applied to them and every one of them served the framework's own ocelot icon.
  it.each([
    ['/favicon.ico', 'favicon', '/branding/acme/assets/favicon.ico'],
    ['/icon.png', 'icon', '/branding/acme/assets/icon.png'],
    ['/apple-touch-icon.png', 'icon', '/branding/acme/assets/icon.png'],
    ['/apple-touch-icon-precomposed.png', 'icon', '/branding/acme/assets/icon.png'],
  ])('redirects %s to the active brand %s', (url, slot, href) => {
    branded({ [slot]: href })

    const { res, next } = run(url)

    expect(res.statusCode).toBe(302)
    expect(res.headers.Location).toBe(href)
    // Same reason the dynamic manifest is uncached: an admin brand switch has to be picked up.
    expect(res.headers['Cache-Control']).toBe('no-cache')
    expect(res.ended).toBe(true)
    expect(next).not.toHaveBeenCalled()
  })

  it('ignores the query string when matching', () => {
    branded({ favicon: '/branding/acme/assets/favicon.ico' })

    expect(run('/favicon.ico?v=3').res.headers.Location).toBe('/branding/acme/assets/favicon.ico')
  })

  // Falling through is what keeps the framework's own static/favicon.ico + static/icon.png serving a
  // vanilla instance exactly as before — this middleware adds an answer, it never removes one.
  it('falls through when the active brand has no file for the slot', () => {
    const { res, next } = run('/favicon.ico') // framework defaults: favicon + icon are null

    expect(next).toHaveBeenCalled()
    expect(res.ended).toBe(false)
    expect(res.statusCode).toBe(200)
  })

  it('falls through for a path it does not own', () => {
    branded({ favicon: '/branding/acme/assets/favicon.ico' })

    expect(run('/img/custom/logo.svg').next).toHaveBeenCalled()
  })

  // A redirect answering a POST would swallow it; only reads have a well-known-icon meaning.
  it.each([['POST'], ['PUT'], ['DELETE']])('falls through for a %s request', (method) => {
    branded({ favicon: '/branding/acme/assets/favicon.ico' })

    expect(run('/favicon.ico', method).next).toHaveBeenCalled()
  })

  it('answers a HEAD request like a GET', () => {
    branded({ favicon: '/branding/acme/assets/favicon.ico' })

    expect(run('/favicon.ico', 'HEAD').res.statusCode).toBe(302)
  })

  // A brand is free to point a slot at the framework path it is standing in for; redirecting there
  // would loop forever.
  it('falls through rather than redirecting a slot onto itself', () => {
    branded({ favicon: '/favicon.ico' })

    const { res, next } = run('/favicon.ico')

    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  // Nothing guarantees a request carries a url (connect hands on what the server parsed), and an
  // icon path is not worth a 500.
  it('falls through for a request with no url', () => {
    branded({ favicon: '/branding/acme/assets/favicon.ico' })

    expect(run(undefined).next).toHaveBeenCalled()
  })

  // A partial brand package (identity but no logos bucket, or a pre-0.1.2 archive) composes to a
  // config without the assets slice at all.
  it('falls through when the active brand carries no assets at all', () => {
    setBranding({ ...brandingDefaults, assets: undefined })

    expect(run('/favicon.ico').next).toHaveBeenCalled()
  })
})
