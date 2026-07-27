// jest.mock is hoisted above the import, so branding-head sees this malicious brand config.
import brandingHead from './branding-head.js'

jest.mock('@ocelot-social/branding', () => ({
  branding: {
    assets: {},
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
  },
}))

describe('branding-head plugin', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('emits a #branding-theme style element', () => {
    brandingHead()
    expect(document.getElementById('branding-theme')).not.toBeNull()
  })

  it('strips CSS breakout characters so brand values cannot inject rules', () => {
    brandingHead()
    const css = document.getElementById('branding-theme').textContent
    // We generate exactly two blocks: one @font-face and one :root. A successful breakout via a
    // malicious value would add more `{`/`}` — the brace count is the security invariant.
    expect((css.match(/{/g) || []).length).toBe(2)
    expect((css.match(/}/g) || []).length).toBe(2)
    expect(css).not.toMatch(/body\s*{/) // no injected `body { … }` rule
  })

  it('keeps legitimate values (and sanitizes only unsafe keys)', () => {
    brandingHead()
    const css = document.getElementById('branding-theme').textContent
    expect(css).toContain('--color-legit: rgb(1, 2, 3);') // parens/commas/spaces preserved
    expect(css).toContain('--color-primary:') // still emitted, just with the breakout chars removed
    expect(css).toContain('--evilkey:') // `evil}key` → `evilkey`
    expect(css).not.toContain('}key')
  })
})
