// The colour theme a user picked: 'light', 'dark', or 'system' (follow prefers-color-scheme).
// Carried in a cookie so the server can put it on <html data-theme> before the first paint.
export const THEME_COOKIE = 'ocelot-theme'
export const THEMES = ['system', 'light', 'dark']

export const normalizeTheme = (value) => (THEMES.includes(value) ? value : 'system')

export const themeFromCookieHeader = (header) => {
  const match = String(header || '').match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`))
  // The header comes from outside: a value that cannot be decoded is not a theme either.
  try {
    return normalizeTheme(match && decodeURIComponent(match[1]))
  } catch (_e) {
    return normalizeTheme(null)
  }
}

// A brand with one colour scheme (branding theme.colorScheme 'light' or 'dark') is pinned to it:
// the visitor's cookie and system preference only count where the brand has both ('light dark').
export const pinnedTheme = (colorScheme, theme) =>
  colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : normalizeTheme(theme)

export const THEME_CHANGE_EVENT = 'ocelot-theme-change'

export const applyTheme = (theme, doc = document) => {
  doc.documentElement.setAttribute('data-theme', normalizeTheme(theme))
  const win = doc.defaultView
  if (win) win.dispatchEvent(new win.CustomEvent(THEME_CHANGE_EVENT))
}

// Calls back whenever the effective theme may have changed: the switch, or the system
// scheme while the switch stands on 'system'. Returns the unsubscribe.
export const onThemeChange = (callback, win = window) => {
  const media = win.matchMedia ? win.matchMedia('(prefers-color-scheme: dark)') : null
  win.addEventListener(THEME_CHANGE_EVENT, callback)
  if (media) media.addEventListener('change', callback)
  return () => {
    win.removeEventListener(THEME_CHANGE_EVENT, callback)
    if (media) media.removeEventListener('change', callback)
  }
}

// Whether the page is dark right now — the explicit choice on <html data-theme>, else the system's.
// For code that needs the answer itself (a map style URL), where CSS alone cannot follow the theme.
export const isDarkTheme = (doc = document, win = window) => {
  const theme = normalizeTheme(doc.documentElement.getAttribute('data-theme'))
  if (theme !== 'system') return theme === 'dark'
  return Boolean(win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches)
}
