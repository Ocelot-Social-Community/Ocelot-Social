// The colour theme a user picked: 'light', 'dark', or 'system' (follow prefers-color-scheme).
// Carried in a cookie so the server can put it on <html data-theme> before the first paint.
export const THEME_COOKIE = 'ocelot-theme'
export const THEMES = ['system', 'light', 'dark']

export const normalizeTheme = (value) => (THEMES.includes(value) ? value : 'system')

export const themeFromCookieHeader = (header) => {
  const match = String(header || '').match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`))
  return normalizeTheme(match && decodeURIComponent(match[1]))
}

export const applyTheme = (theme, doc = document) => {
  doc.documentElement.setAttribute('data-theme', normalizeTheme(theme))
}
