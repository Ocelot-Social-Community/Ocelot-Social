import {
  CSS_LINK_ATTR,
  THEME_STYLE_ID,
  brandingCssHrefs,
  brandingHeadHtml,
  themeCss,
} from './brandingHead.js'

describe('themeCss', () => {
  it('emits the brand @font-face blocks and its custom properties on :root', () => {
    const css = themeCss({
      cssVars: { 'color-primary': 'rgb(1, 2, 3)', 'font-family-text': 'Dosis, sans-serif' },
      fontFaces: [{ family: 'Dosis', src: '/f.woff2', format: 'woff2', weight: '400' }],
    })

    expect(css).toContain(
      "@font-face { font-family: 'Dosis'; src: url('/f.woff2') format('woff2');",
    )
    expect(css).toContain('font-weight: 400;')
    expect(css).toContain('--color-primary: rgb(1, 2, 3);')
    expect(css).toContain('--font-family-text: Dosis, sans-serif;')
  })

  // Regression: with a plain `:root` the framework's own defaults (ocelot-ui-variables.scss, also
  // `:root`) win whenever they land later in the document — which they do, because Nuxt 2 defaults to
  // `build.extractCSS: false` and vue-style-loader injects the bundle during hydration. reformer's
  // grey footer then rendered ocelot blue. The doubled selector matches the same element at a higher
  // specificity, so the brand wins regardless of order.
  it('out-specifies the framework defaults instead of relying on document order', () => {
    const css = themeCss({ cssVars: { 'color-secondary-active': 'rgb(135, 135, 135)' } })

    expect(css).toContain(':root:root {')
    expect(css).not.toMatch(/(^|[^:])\B:root \{/)
  })

  // A vanilla render must stay byte-identical to what it was before the SSR hook existed, so an
  // uncustomised theme has to produce NO element at all rather than an empty `:root:root { }`.
  it('is empty when the brand customises neither vars nor fonts', () => {
    expect(themeCss({})).toBe('')
    expect(themeCss({ cssVars: {}, fontFaces: [] })).toBe('')
    expect(themeCss(undefined)).toBe('')
  })

  it('strips CSS breakout characters so brand values cannot inject rules', () => {
    const css = themeCss({
      cssVars: { 'color-primary': 'red; } body { display: none } :root {', 'evil}key': 'blue' },
      fontFaces: [
        { family: "Eco'; } body { display: none } @font-face { font-family: 'x", src: '/f' },
      ],
    })

    // Exactly two blocks are generated (one @font-face, one :root); a successful breakout would add
    // more braces — the brace count is the security invariant.
    expect((css.match(/{/g) || []).length).toBe(2)
    expect((css.match(/}/g) || []).length).toBe(2)
    expect(css).not.toMatch(/body\s*{/)
    expect(css).toContain('--evilkey:') // `evil}key` → `evilkey`
  })
})

describe('brandingCssHrefs', () => {
  it('returns the brand stylesheets and drops empty entries', () => {
    expect(brandingCssHrefs({ assets: { css: ['/branding/acme/a.css', '', null] } })).toEqual([
      '/branding/acme/a.css',
    ])
    expect(brandingCssHrefs({})).toEqual([])
    expect(brandingCssHrefs(undefined)).toEqual([])
  })
})

describe('brandingHeadHtml', () => {
  const branding = {
    assets: { css: ['/branding/acme/assets/css/branding.css'] },
    theme: { cssVars: { 'color-primary': 'rgb(1, 2, 3)' } },
  }

  it('emits the stylesheet links before the theme style', () => {
    const html = brandingHeadHtml(branding)

    expect(html.indexOf('<link')).toBeLessThan(html.indexOf('<style'))
    expect(html).toContain(
      `<link rel="stylesheet" href="/branding/acme/assets/css/branding.css" ${CSS_LINK_ATTR}="/branding/acme/assets/css/branding.css">`,
    )
    expect(html).toContain(`<style id="${THEME_STYLE_ID}">`)
  })

  it('escapes the href so a brand path cannot break out of the attribute', () => {
    const html = brandingHeadHtml({ assets: { css: ['/a.css"><script>x</script>'] } })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('emits nothing for a brand that customises neither theme nor stylesheets', () => {
    expect(brandingHeadHtml({})).toBe('')
    expect(brandingHeadHtml({ assets: { css: [] }, theme: { cssVars: {} } })).toBe('')
  })
})
