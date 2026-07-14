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
    expect(json.theme_color).toBe(resolveThemeColor(getBranding().theme.cssVars))
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
      // The PWA theme_color is the brand's primary colour (no separate metadata.themeColor).
      theme: { ...brandingDefaults.theme, cssVars: { 'color-primary': 'rgb(110, 139, 135)' } },
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

  it('derives the 192/512 PWA icons from the brand ogImage + ogImageType', () => {
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
})
