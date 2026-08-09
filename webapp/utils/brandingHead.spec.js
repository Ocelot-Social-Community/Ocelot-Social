import { CSS_LINK_ATTR, brandingCssHrefs, brandingHeadHtml } from './brandingHead.js'

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
  // The `theme.tokens` here are NOT decoration and must not be dropped: they are what makes the
  // `not.toContain('<style')` below an assertion rather than a truism. A brand that HAS custom
  // properties is precisely the case in which a reintroduced inline theme <style> would appear.
  const branding = {
    assets: { css: ['/branding/acme/assets/css/branding.css'] },
    theme: { tokens: { 'color-primary': 'rgb(1, 2, 3)' } },
  }

  // There is no separate theme <style> any more: a brand's custom properties live in its own
  // stylesheet, which the build ships with `:root:root` so it wins on specificity.
  it('emits the stylesheet links and nothing else', () => {
    const html = brandingHeadHtml(branding)

    expect(html).toContain(
      `<link rel="stylesheet" href="/branding/acme/assets/css/branding.css" ${CSS_LINK_ATTR}="/branding/acme/assets/css/branding.css">`,
    )
    expect(html).not.toContain('<style')
  })

  it('escapes the href so a brand path cannot break out of the attribute', () => {
    const html = brandingHeadHtml({ assets: { css: ['/a.css"><script>x</script>'] } })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  // The head is driven by `assets.css` ALONE. A brand carrying theme tokens but shipping no stylesheet
  // of its own contributes nothing here — its tokens reach the page through the stylesheet the build
  // writes them into, never through this markup.
  it('emits nothing for a brand that ships no stylesheet, tokens or not', () => {
    expect(brandingHeadHtml({})).toBe('')
    expect(
      brandingHeadHtml({
        assets: { css: [] },
        theme: { tokens: { 'color-primary': 'rgb(1,2,3)' } },
      }),
    ).toBe('')
  })
})
