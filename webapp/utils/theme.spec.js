import { applyTheme, normalizeTheme, themeFromCookieHeader } from './theme'

describe('theme', () => {
  it('reads the theme from a cookie header', () => {
    expect(themeFromCookieHeader('a=1; ocelot-theme=dark; b=2')).toBe('dark')
    expect(themeFromCookieHeader('ocelot-theme=light')).toBe('light')
  })

  it('falls to system for no cookie or an unknown value', () => {
    expect(themeFromCookieHeader(undefined)).toBe('system')
    expect(themeFromCookieHeader('ocelot-theme=purple')).toBe('system')
    expect(normalizeTheme(null)).toBe('system')
  })

  it('puts the theme on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('nonsense')
    expect(document.documentElement.getAttribute('data-theme')).toBe('system')
  })
})
