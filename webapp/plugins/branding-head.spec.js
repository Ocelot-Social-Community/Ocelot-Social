// jest.mock is hoisted above the import, so branding-head sees this malicious brand config.
import { CSS_LINK_ATTR, THEME_STYLE_ID, brandingHeadHtml } from '~/utils/brandingHead.js'

import brandingHead from './branding-head.js'

const BRAND = {
  assets: { favicon: '/branding/acme/assets/favicon.ico', css: ['/branding/acme/assets/b.css'] },
  theme: {
    cssVars: {
      // value tries to close :root and inject a rule; key tries to break the property name
      'color-primary': 'red; } body { display: none } :root {',
      'evil}key': 'blue',
      // a legit value must survive untouched (parens, commas, spaces, %)
      'color-legit': 'rgb(1, 2, 3)',
    },
    fontFaces: [
      {
        family: "Eco'; } body { display: none } @font-face { font-family: 'x",
        src: "/f.woff2') } body { display: none } @font-face { src: url('x",
        format: 'woff2',
        weight: '400',
        style: 'normal',
      },
    ],
  },
}

jest.mock('@ocelot-social/branding', () => ({ branding: BRAND }))

describe('branding-head plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('emits a #branding-theme style element', () => {
    brandingHead()
    expect(document.getElementById(THEME_STYLE_ID)).not.toBeNull()
  })

  it('strips CSS breakout characters so brand values cannot inject rules', () => {
    brandingHead()
    const css = document.getElementById(THEME_STYLE_ID).textContent
    // We generate exactly two blocks: one @font-face and one :root. A successful breakout via a
    // malicious value would add more `{`/`}` — the brace count is the security invariant.
    expect((css.match(/{/g) || []).length).toBe(2)
    expect((css.match(/}/g) || []).length).toBe(2)
    expect(css).not.toMatch(/body\s*{/) // no injected `body { … }` rule
  })

  it('keeps legitimate values (and sanitizes only unsafe keys)', () => {
    brandingHead()
    const css = document.getElementById(THEME_STYLE_ID).textContent
    expect(css).toContain('--color-legit: rgb(1, 2, 3);') // parens/commas/spaces preserved
    expect(css).toContain('--color-primary:') // still emitted, just with the breakout chars removed
    expect(css).toContain('--evilkey:') // `evil}key` → `evilkey`
    expect(css).not.toContain('}key')
  })

  it('adds the brand stylesheet and retargets the favicon', () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico">'
    brandingHead()

    expect(document.querySelector('link[rel="icon"]').getAttribute('href')).toBe(
      '/branding/acme/assets/favicon.ico',
    )
    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
  })

  // The SSR hook (nuxt.config.js) writes the same tags into the rendered HEAD. Running the plugin on
  // top of a server-branded page must be a no-op — otherwise every hydration would duplicate the
  // stylesheet and rewrite the theme block.
  it('leaves the tags the server already rendered untouched', () => {
    // a server-rendered page: nuxt.config's favicon link, then what the SSR hook appended
    document.head.innerHTML = `<link rel="icon" href="/favicon.ico">${brandingHeadHtml(BRAND)}`
    const rendered = brandingHeadHtml(BRAND)

    brandingHead()

    // nothing duplicated, and the SSR markup is still there verbatim
    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
    expect(document.querySelectorAll(`#${THEME_STYLE_ID}`)).toHaveLength(1)
    expect(document.head.innerHTML).toContain(rendered)
    // the favicon is the ONE thing SSR leaves alone (it retargets nuxt's link instead of adding a
    // second icon), so this is the only mutation the plugin still makes.
    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1)
    expect(document.querySelector('link[rel="icon"]').getAttribute('href')).toBe(
      '/branding/acme/assets/favicon.ico',
    )
  })

  // A brand's own rules mostly match framework selectors on equal specificity and win by being LAST.
  // With `build.extractCSS: false` the app CSS is injected during hydration, i.e. after the tags the
  // server rendered — so the plugin has to move them back to the end instead of leaving them put.
  it('moves the server-rendered tags to the end of head, after late-injected app CSS', () => {
    document.head.innerHTML = `${brandingHeadHtml(BRAND)}<style id="app-css">.x{}</style>`

    brandingHead()

    const ids = [...document.head.children].map((el) => el.id || el.getAttribute(CSS_LINK_ATTR))
    expect(ids.indexOf('app-css')).toBeLessThan(ids.indexOf('/branding/acme/assets/b.css'))
    expect(ids[ids.length - 1]).toBe(THEME_STYLE_ID)
    // still exactly one of each — moved, not duplicated
    expect(document.querySelectorAll(`link[${CSS_LINK_ATTR}]`)).toHaveLength(1)
    expect(document.querySelectorAll(`#${THEME_STYLE_ID}`)).toHaveLength(1)
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
      expect(document.getElementById(THEME_STYLE_ID)).not.toBeNull()
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

    expect(document.head.querySelector(`#${THEME_STYLE_ID}`).textContent).toBe(
      ssr.querySelector(`#${THEME_STYLE_ID}`).textContent,
    )
    const hrefs = (root) =>
      [...root.querySelectorAll(`link[${CSS_LINK_ATTR}]`)].map((l) => l.getAttribute('href'))
    expect(hrefs(document.head)).toEqual(hrefs(ssr))
  })
})
