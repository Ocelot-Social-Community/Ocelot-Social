// jest.mock is hoisted above the import, so branding-head sees this malicious brand config.
//
// The fixture is deliberately NOT named `mockBrand`. babel-plugin-jest-hoist allows a `mock*`-prefixed
// out-of-scope variable in the factory but does NOT hoist its declaration; the factory here runs during
// the (already hoisted) `import brandingHead from './branding-head.js'`, so the const would still be in
// its temporal dead zone → "Cannot access 'mockBrand' before initialization", suite fails to run.
// A plain `const` with a PURE initializer takes the other allowance in that plugin, which hoists the
// declaration TOGETHER with the jest.mock call — which is exactly what makes this work. Keep it pure:
// wrapping the literal in any call (e.g. a builder or deepFreeze) fails the purity check and throws
// "not allowed to reference any out-of-scope variables" at transform time.
import { CSS_LINK_ATTR, brandingHeadHtml } from '~/utils/brandingHead.js'

import brandingHead from './branding-head.js'

const BRAND = {
  assets: { favicon: '/branding/acme/assets/favicon.ico', css: ['/branding/acme/assets/b.css'] },
  theme: {},
}

jest.mock('@ocelot-social/branding', () => ({ branding: BRAND }))

describe('branding-head plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('adds the brand stylesheet', () => {
    brandingHead()

    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
  })

  // The favicon moved to plugins/branding-favicon.js, which brands it through vue-meta on both render
  // paths. This plugin must not touch the icon link any more — doing both would mean two mechanisms
  // writing the same tag, and the DOM one would win over the server-rendered value after hydration.
  it('leaves the icon link to the vue-meta slot', () => {
    document.head.innerHTML = '<link rel="icon" href="/branding/acme/assets/favicon.ico">'

    brandingHead()

    expect(
      [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.getAttribute('href')),
    ).toEqual(['/branding/acme/assets/favicon.ico'])
  })

  // The SSR hook (nuxt.config.js) writes the same tags into the rendered HEAD. Running the plugin on
  // top of a server-branded page must be a no-op — otherwise every hydration would duplicate the
  // stylesheet and rewrite the theme block.
  it('leaves the tags the server already rendered untouched', () => {
    // a server-rendered page: the vue-meta icon link (already branded), then what the SSR hook appended
    const icon = '<link rel="icon" href="/branding/acme/assets/favicon.ico">'
    document.head.innerHTML = `${icon}${brandingHeadHtml(BRAND)}`
    const rendered = brandingHeadHtml(BRAND)

    brandingHead()

    // nothing duplicated, and the SSR markup is still there verbatim
    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
    expect(document.head.innerHTML).toContain(rendered)
    expect(document.head.innerHTML).toContain(icon)
  })

  // A brand's own rules mostly match framework selectors on equal specificity and win by being LAST.
  // With `build.extractCSS: false` the app CSS is injected during hydration, i.e. after the tags the
  // server rendered — so the plugin has to move them back to the end instead of leaving them put.
  it('moves the server-rendered tags to the end of head, after late-injected app CSS', () => {
    document.head.innerHTML = `${brandingHeadHtml(BRAND)}<style id="app-css">.x{}</style>`

    brandingHead()

    const ids = [...document.head.children].map((el) => el.id || el.getAttribute(CSS_LINK_ATTR))
    expect(ids.indexOf('app-css')).toBeLessThan(ids.indexOf('/branding/acme/assets/b.css'))
    // still exactly one of each — moved, not duplicated
    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
  })

  // `assets.css` is an unvalidated string[] in the schema, so a brand can put a `"` in an href.
  // Building `link[data-branding-css="${href}"]` from it yields an INVALID selector; querySelector
  // then throws a DOMException and the plugin dies before it ever applies the theme.
  describe('an href containing a quote', () => {
    const HOSTILE = '/branding/acme/assets/a".css'
    const original = BRAND.assets.css

    beforeEach(() => {
      BRAND.assets.css = [HOSTILE]
    })
    afterEach(() => {
      BRAND.assets.css = original
    })

    it('does not throw, and still applies the theme', () => {
      expect(() => brandingHead()).not.toThrow()

      expect(document.querySelector(`link[${CSS_LINK_ATTR}]`).getAttribute('href')).toBe(HOSTILE)
    })

    // The SSR hook escapes the href for the HTML attribute; parsing gives the raw value back, so the
    // client has to recognise its own server-rendered link and not add a duplicate.
    it('recognises the link the server rendered for it', () => {
      document.head.innerHTML = brandingHeadHtml(BRAND)

      brandingHead()

      expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
    })
  })

  // Server and client must resolve the cascade identically, so both have to produce the SAME theme
  // CSS and the SAME stylesheet links, in the same order.
  it('produces the same markup the SSR hook renders', () => {
    brandingHead()

    const ssr = document.createElement('div')
    ssr.innerHTML = brandingHeadHtml(BRAND)

    // Both paths emit the same <link> set; there is no theme <style> to compare any more.
    expect(document.head.querySelectorAll(`[${CSS_LINK_ATTR}]`)).toHaveLength(
      ssr.querySelectorAll(`[${CSS_LINK_ATTR}]`).length,
    )
    const hrefs = (root) =>
      [...root.querySelectorAll(`link[${CSS_LINK_ATTR}]`)].map((l) => l.getAttribute('href'))
    expect(hrefs(document.head)).toEqual(hrefs(ssr))
  })
})
