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
})
