import seo from './seo.js'

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
        { hid: 'og:image', property: 'og:image', content: '/test/og.png' },
      ]),
    )
  })

  it('does not crash and falls back to a "undefined" body class when the route has no name', () => {
    // Error / redirect routes can carry no name; head() must still resolve cleanly.
    const ctx = {
      $i18n: { locale: () => 'en' },
      $route: { name: undefined },
    }
    const head = seo.head.call(ctx)
    expect(head.htmlAttrs).toEqual({ lang: 'en' })
    expect(head.bodyAttrs).toEqual({ class: 'page-name-undefined' })
  })
})
