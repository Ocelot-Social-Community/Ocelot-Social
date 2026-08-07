const manifest = require('./manifest.js')
const {
  setBranding,
  getBranding,
  brandingDefaults,
  resolveThemeColor,
} = require('@ocelot-social/branding')

function run() {
  const res = {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value
    },
    end(body) {
      this.body = body
    },
  }
  manifest({}, res)
  return { res, json: JSON.parse(res.body) }
}

describe('manifest serverMiddleware', () => {
  afterEach(() => setBranding(undefined)) // reset to framework defaults

  it('serves an application/manifest+json manifest from the framework defaults', () => {
    const { res, json } = run()
    expect(res.headers['Content-Type']).toBe('application/manifest+json')
    expect(res.headers['Cache-Control']).toBe('no-cache')
    expect(json.name).toBe(getBranding().metadata.applicationName)
    expect(json.theme_color).toBe(resolveThemeColor(getBranding().theme))
    expect(json.display).toBe('standalone')
    expect(json.start_url).toBe('/')
    expect(json.icons.length).toBeGreaterThan(0)
  })

  it('reflects a runtime-injected brand (live switch, no rebuild)', () => {
    setBranding({
      ...brandingDefaults,
      metadata: {
        ...brandingDefaults.metadata,
        applicationName: 'yunite.me',
        applicationShortName: 'yunite',
      },
      // The PWA theme_color is the brand's own `color-primary` theme token — no field of its own.
      theme: { ...brandingDefaults.theme, tokens: { 'color-primary': 'rgb(110, 139, 135)' } },
    })
    const { json } = run()
    expect(json.name).toBe('yunite.me')
    expect(json.short_name).toBe('yunite')
    expect(json.theme_color).toBe('rgb(110, 139, 135)')
  })

  it('returns an empty icons array when the brand has no ogImage', () => {
    setBranding({
      ...brandingDefaults,
      metadata: { ...brandingDefaults.metadata, ogImage: '' },
    })
    const { json } = run()
    expect(json.icons).toEqual([])
  })

  it('falls back to the 192/512 PWA icons from the brand ogImage + ogImageType', () => {
    setBranding({
      ...brandingDefaults,
      metadata: {
        ...brandingDefaults.metadata,
        ogImage: '/branding/acme/assets/logo-squared.svg',
        ogImageType: 'image/svg+xml',
      },
    })
    const { json } = run()
    expect(json.icons).toEqual([
      { src: '/branding/acme/assets/logo-squared.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/branding/acme/assets/logo-squared.svg', sizes: '512x512', type: 'image/svg+xml' },
    ])
  })

  // ogImage is a SHARE image — 1200×1140 by default and often an .svg, which several browsers refuse
  // in a manifest. `assets.icon` is the square raster icon a brand ships for installing, so it wins.
  it('prefers the brand assets.icon over the ogImage', () => {
    setBranding({
      ...brandingDefaults,
      assets: { ...brandingDefaults.assets, icon: '/branding/acme/assets/icon.png' },
      metadata: {
        ...brandingDefaults.metadata,
        ogImage: '/branding/acme/assets/logo-squared.svg',
        ogImageType: 'image/svg+xml',
      },
    })
    const { json } = run()
    // The type follows the ICON's own extension — carrying ogImageType across would label the png
    // image/svg+xml and browsers do reject on that mismatch.
    expect(json.icons).toEqual([
      { src: '/branding/acme/assets/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/branding/acme/assets/icon.png', sizes: '512x512', type: 'image/png' },
    ])
  })
})
