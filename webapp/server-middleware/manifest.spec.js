const manifest = require('./manifest.js')
const {
  setBranding,
  getBranding,
  brandingDefaults,
  resolveThemeColor,
  DEFAULT_COLOR_PRIMARY,
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

  // resolveThemeColor's own fallback ladder is pinned where it lives (packages/branding theme.spec.ts).
  // What these pin is the WIRING: the manifest hands it `branding.theme`, so a brand that carries no
  // usable `color-primary` — a partial package with identity but no theme, or a pre-0.1.2 archive still
  // mounted from a volume — serves a real colour rather than `""`/`undefined` into the browser chrome.
  it.each([
    ['no tokens at all (partial package)', {}, DEFAULT_COLOR_PRIMARY],
    ['other tokens but not this one', { tokens: { 'color-danger': 'red' } }, DEFAULT_COLOR_PRIMARY],
    ['an empty color-primary', { tokens: { 'color-primary': '' } }, DEFAULT_COLOR_PRIMARY],
    ['the legacy pre-0.1.2 themeColor', { themeColor: 'rgb(1, 2, 3)' }, 'rgb(1, 2, 3)'],
  ])('resolves the theme_color of a brand with %s', (_name, theme, expected) => {
    setBranding({ ...brandingDefaults, theme })
    expect(run().json.theme_color).toBe(expected)
  })

  it('returns an empty icons array when the brand has no ogImage', () => {
    setBranding({
      ...brandingDefaults,
      metadata: { ...brandingDefaults.metadata, ogImage: '' },
    })
    const { json } = run()
    expect(json.icons).toEqual([])
  })

  // Nothing measured the ogImage — it is not the icon slot — so the historical pair is still the best
  // guess available for it.
  it('falls back to the 192/512 PWA icons from the brand ogImage + ogImageType', () => {
    setBranding({
      ...brandingDefaults,
      metadata: {
        ...brandingDefaults.metadata,
        ogImage: '/branding/acme/assets/og.png',
        ogImageType: 'image/png',
      },
    })
    const { json } = run()
    expect(json.icons).toEqual([
      { src: '/branding/acme/assets/og.png', sizes: '192x192', type: 'image/png' },
      { src: '/branding/acme/assets/og.png', sizes: '512x512', type: 'image/png' },
    ])
  })

  // A manifest icon has to be a bitmap. The type is derived from the path, so an .svg is published as
  // image/svg+xml — and a browser that will not rasterise a manifest icon drops it. Listing it anyway
  // only makes the manifest claim an install icon that no installer can use.
  it('drops a non-raster icon rather than publishing one browsers refuse', () => {
    setBranding({
      ...brandingDefaults,
      metadata: {
        ...brandingDefaults.metadata,
        // The default ogImage fallback for a brand that sets none: its own squared logo, an svg.
        ogImage: '/branding/acme/assets/logo-squared.svg',
        ogImageType: 'image/svg+xml',
      },
    })
    expect(run().json.icons).toEqual([])
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

  // The branding build measures the icon it packs (assets.iconSizes). One honest entry beats two
  // contradicting ones: a browser scales a single candidate to whatever slot it needs, while a file
  // whose decoded size contradicts its `sizes` can be discarded outright — which is how every ocelot
  // brand, all shipping 225px icons declared at 512, ended up installable under no icon of its own.
  it('declares the measured size of assets.icon as a single icon entry', () => {
    setBranding({
      ...brandingDefaults,
      assets: {
        ...brandingDefaults.assets,
        icon: '/branding/acme/assets/icon.png',
        iconSizes: '225x225',
      },
    })
    expect(run().json.icons).toEqual([
      { src: '/branding/acme/assets/icon.png', sizes: '225x225', type: 'image/png' },
    ])
  })

  // A partial brand package (identity but no logos bucket, or a pre-0.1.2 archive still mounted from
  // a volume) composes to a config with no assets slice at all.
  it('survives a brand that carries no assets at all', () => {
    setBranding({ ...brandingDefaults, assets: undefined })
    const { json } = run()

    // Still installable: the ogImage default is a raster file, so the fallback pair applies.
    expect(json.icons).toEqual([
      { src: brandingDefaults.metadata.ogImage, sizes: '192x192', type: 'image/png' },
      { src: brandingDefaults.metadata.ogImage, sizes: '512x512', type: 'image/png' },
    ])
  })

  // An icon served by a route rather than a file has no extension to read a type from — then, and only
  // then, the brand's declared ogImageType is the better guess than assuming PNG.
  it('falls back to ogImageType when the path names no extension', () => {
    setBranding({
      ...brandingDefaults,
      metadata: {
        ...brandingDefaults.metadata,
        ogImage: '/api/brand-image',
        ogImageType: 'image/webp',
      },
    })

    expect(run().json.icons[0].type).toBe('image/webp')
  })

  // Neither source says anything: an extension-less ogImage the brand never typed. PNG is the assumption
  // of last resort here — unlike the icon slot below, the ogImage IS what ogImageType is about, so a
  // brand leaving it blank has declined to correct the guess rather than been asked about a second file.
  it('assumes PNG for an extension-less ogImage the brand declared no type for', () => {
    setBranding({
      ...brandingDefaults,
      metadata: { ...brandingDefaults.metadata, ogImage: '/api/brand-image', ogImageType: '' },
    })

    expect(run().json.icons[0].type).toBe('image/png')
  })

  // ...but ONLY for the file it describes. With the icon slot filled by a route of its own, the two
  // are different files, and announcing the OG image's type for the icon is how a browser ends up
  // dropping a perfectly good PNG for contradicting its declaration. No type is the honest answer —
  // the field is optional and the browser sniffs.
  it('declares no type for an extension-less assets.icon rather than the ogImage type', () => {
    setBranding({
      ...brandingDefaults,
      assets: { ...brandingDefaults.assets, icon: '/api/brand-icon', iconSizes: '512x512' },
      metadata: { ...brandingDefaults.metadata, ogImageType: 'image/jpeg' },
    })

    expect(run().json.icons).toEqual([{ src: '/api/brand-icon', sizes: '512x512' }])
  })

  // The measurement belongs to `assets.icon` alone. A brand with a size but no icon falls back to its
  // ogImage — a DIFFERENT file — and carrying the number across would declare one file's dimensions
  // for another's.
  it('does not apply the measured size to the ogImage fallback', () => {
    setBranding({
      ...brandingDefaults,
      assets: { ...brandingDefaults.assets, icon: null, iconSizes: '225x225' },
      metadata: { ...brandingDefaults.metadata, ogImage: '/branding/acme/assets/og.png' },
    })
    expect(run().json.icons).toEqual([
      { src: '/branding/acme/assets/og.png', sizes: '192x192', type: 'image/png' },
      { src: '/branding/acme/assets/og.png', sizes: '512x512', type: 'image/png' },
    ])
  })
})
