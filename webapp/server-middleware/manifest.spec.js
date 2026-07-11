const manifest = require('./manifest.js')
const { setBranding, getBranding, brandingDefaults } = require('@ocelot-social/branding')

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
    expect(json.theme_color).toBe(getBranding().metadata.themeColor)
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
        themeColor: 'rgb(110, 139, 135)',
      },
    })
    const { json } = run()
    expect(json.name).toBe('yunite.me')
    expect(json.short_name).toBe('yunite')
    expect(json.theme_color).toBe('rgb(110, 139, 135)')
  })
})
