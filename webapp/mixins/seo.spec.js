import seo, { absoluteUrl } from './seo.js'

// Mock the metadata adapter with fixed, DISTINCT values per field so the assertions are independent of
// the real branding proxy AND a cross-wiring bug (e.g. og:title reading the description) is caught.
// jest.mock is hoisted above the import of seo.js, so seo.js sees these values.
jest.mock('~/constants/metadata', () => ({
  __esModule: true,
  default: {
    APPLICATION_NAME: 'Test Network',
    APPLICATION_DESCRIPTION: 'Test network description',
    THEME_COLOR: '#abcdef',
    OG_IMAGE: '/test/og.png',
    OG_IMAGE_ALT: 'Test OG alt',
    OG_IMAGE_WIDTH: '1200',
    OG_IMAGE_HEIGHT: '630',
    OG_IMAGE_TYPE: 'image/png',
  },
}))

describe('seo mixin', () => {
  it('returns locale, route body class, and runtime-branded title + OG meta via head()', () => {
    const ctx = {
      $i18n: { locale: () => 'de' },
      $route: { name: 'profile' },
      $env: { CLIENT_URI: 'https://network.example' },
    }
    const head = seo.head.call(ctx)
    expect(head.htmlAttrs).toEqual({ lang: 'de' })
    expect(head.bodyAttrs).toEqual({ class: 'page-name-profile' })
    // Title + Open-Graph come from the metadata adapter (branding.metadata); asserted against the fixed
    // mock values so a wrong mapping (not just a wrong source value) fails the test.
    expect(head.title).toBe('Test Network')
    expect(head.titleTemplate).toBe('%s - Test Network')
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { hid: 'description', name: 'description', content: 'Test network description' },
        { hid: 'theme-color', name: 'theme-color', content: '#abcdef' },
        { hid: 'og:title', property: 'og:title', content: 'Test Network' },
        { hid: 'og:description', property: 'og:description', content: 'Test network description' },
        { hid: 'og:site_name', property: 'og:site_name', content: 'Test Network' },
        { hid: 'og:image', property: 'og:image', content: 'https://network.example/test/og.png' },
      ]),
    )
  })

  it('does not crash and falls back to a "undefined" body class when the route has no name', () => {
    // Error / redirect routes can carry no name; head() must still resolve cleanly.
    const ctx = {
      $i18n: { locale: () => 'en' },
      $route: { name: undefined },
      $env: {},
    }
    const head = seo.head.call(ctx)
    expect(head.htmlAttrs).toEqual({ lang: 'en' })
    expect(head.bodyAttrs).toEqual({ class: 'page-name-undefined' })
  })

  it('leaves og:image relative when no public origin is configured', () => {
    const ctx = { $i18n: { locale: () => 'en' }, $route: { name: 'index' }, $env: {} }
    const ogImage = seo.head.call(ctx).meta.find((tag) => tag.hid === 'og:image')
    expect(ogImage.content).toBe('/test/og.png')
  })
})

describe('absoluteUrl', () => {
  it('resolves a path against the origin', () => {
    expect(absoluteUrl('/branding/stage/assets/og.png', 'https://stage.ocelot.social')).toBe(
      'https://stage.ocelot.social/branding/stage/assets/og.png',
    )
  })

  // An origin given with a trailing slash or a path must not double or keep anything of it.
  it('takes only the origin from a base with a path', () => {
    expect(absoluteUrl('/og.png', 'https://network.example/sub/')).toBe(
      'https://network.example/og.png',
    )
  })

  it('keeps an already absolute URL', () => {
    expect(absoluteUrl('https://cdn.example/og.png', 'https://network.example')).toBe(
      'https://cdn.example/og.png',
    )
  })

  it('returns the path unchanged without a path, an origin, or with an invalid origin', () => {
    expect(absoluteUrl(undefined, 'https://network.example')).toBeUndefined()
    expect(absoluteUrl('/og.png', undefined)).toBe('/og.png')
    expect(absoluteUrl('/og.png', 'not a url')).toBe('/og.png')
  })
})
