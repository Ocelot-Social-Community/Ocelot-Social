import {
  applyTheme,
  isDarkTheme,
  normalizeTheme,
  onThemeChange,
  pinnedTheme,
  themeFromCookieHeader,
} from './theme'

describe('pinnedTheme', () => {
  it('pins a brand with one scheme to it, whatever the visitor chose', () => {
    expect(pinnedTheme('light', 'dark')).toBe('light')
    expect(pinnedTheme('dark', 'light')).toBe('dark')
    expect(pinnedTheme('dark', undefined)).toBe('dark')
  })

  it('leaves the choice to the visitor where the brand has both', () => {
    expect(pinnedTheme('light dark', 'dark')).toBe('dark')
    expect(pinnedTheme('light dark', 'bogus')).toBe('system')
  })
})

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

describe('isDarkTheme', () => {
  const doc = (theme) => ({ documentElement: { getAttribute: () => theme } })
  const win = (dark) => ({ matchMedia: () => ({ matches: dark }) })

  it('follows an explicit choice over the system', () => {
    expect(isDarkTheme(doc('dark'), win(false))).toBe(true)
    expect(isDarkTheme(doc('light'), win(true))).toBe(false)
  })

  it('follows the system for system or no attribute', () => {
    expect(isDarkTheme(doc('system'), win(true))).toBe(true)
    expect(isDarkTheme(doc(null), win(false))).toBe(false)
  })

  it('tells subscribers when the theme is applied, until they unsubscribe', () => {
    const callback = jest.fn()
    const off = onThemeChange(callback)
    applyTheme('dark')
    expect(callback).toHaveBeenCalledTimes(1)
    off()
    applyTheme('light')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('falls back to system for a cookie that cannot be decoded', () => {
    expect(themeFromCookieHeader('ocelot-theme=%E0')).toBe('system')
    expect(themeFromCookieHeader('ocelot-theme=%')).toBe('system')
  })
})
