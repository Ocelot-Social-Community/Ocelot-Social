import seo from './seo.js'
import metadata from '~/constants/metadata'

describe('seo mixin', () => {
  it('returns locale, route body class, and runtime-branded title + OG meta via head()', () => {
    const ctx = {
      $i18n: { locale: () => 'de' },
      $route: { name: 'profile' },
    }
    const head = seo.head.call(ctx)
    expect(head.htmlAttrs).toEqual({ lang: 'de' })
    expect(head.bodyAttrs).toEqual({ class: 'page-name-profile' })
    // Title + Open-Graph come from the runtime metadata adapter (branding.metadata), so they follow
    // a live brand switch — asserted against the adapter, not a hardcoded default.
    expect(head.title).toBe(metadata.APPLICATION_NAME)
    expect(head.titleTemplate).toBe(`%s - ${metadata.APPLICATION_NAME}`)
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { hid: 'description', name: 'description', content: metadata.APPLICATION_DESCRIPTION },
        { hid: 'theme-color', name: 'theme-color', content: metadata.THEME_COLOR },
        { hid: 'og:title', property: 'og:title', content: metadata.APPLICATION_NAME },
        { hid: 'og:site_name', property: 'og:site_name', content: metadata.APPLICATION_NAME },
        { hid: 'og:image', property: 'og:image', content: metadata.OG_IMAGE },
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
