import seo from './seo.js'

describe('seo mixin', () => {
  it('returns the current locale and a route-derived body class via head()', () => {
    const ctx = {
      $i18n: { locale: () => 'de' },
      $route: { name: 'profile' },
    }
    const head = seo.head.call(ctx)
    expect(head).toEqual({
      htmlAttrs: { lang: 'de' },
      bodyAttrs: { class: 'page-name-profile' },
    })
  })

  it('does not crash and falls back to a "undefined" body class when the route has no name', () => {
    // Error / redirect routes can carry no name; head() must still resolve cleanly.
    const ctx = {
      $i18n: { locale: () => 'en' },
      $route: { name: undefined },
    }
    const head = seo.head.call(ctx)
    expect(head).toEqual({
      htmlAttrs: { lang: 'en' },
      bodyAttrs: { class: 'page-name-undefined' },
    })
  })
})
