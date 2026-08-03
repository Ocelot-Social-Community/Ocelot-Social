// The auth cookie (the JWT the backend issues on login) — name and attributes resolved at RUNTIME.
//
// WHY THIS EXISTS instead of @nuxtjs/apollo's `$apolloHelpers`: that module renders its token name
// into the generated plugin as a STRING LITERAL when the bundle is built (see its
// templates/plugin.js — AUTH_TOKEN_NAME), and `onLogin`/`onLogout`/`getToken` close over that
// literal. Ocelot ships ONE pre-built webapp image for every deployment (the nuxt build runs before
// `ARG BRAND`, brand-agnostic on purpose), so a name set per deployment could never reach it.
//
// Everything here reads `publicRuntimeConfig` instead, which nuxt re-evaluates when the SERVER
// starts and serialises to the client (`window.__NUXT__.config`) — so COOKIE_NAME,
// COOKIE_EXPIRE_TIME and COOKIE_HTTPS_ONLY are deployment values (Helm `webapp.env.*` → pod env)
// that take effect WITHOUT a rebuild. The cookie itself is written by cookie-universal-nuxt
// (`$cookies`), the same layer plugins/i18n.js already uses.

/** Framework default — what a deployment gets when it sets no COOKIE_NAME. */
export const DEFAULT_COOKIE_NAME = 'ocelot-social-token'

/** Framework default cookie lifetime in days, used when COOKIE_EXPIRE_TIME is unset or unusable. */
export const DEFAULT_EXPIRE_DAYS = 730

export function resolveCookieName($config) {
  return ($config && $config.cookieName) || DEFAULT_COOKIE_NAME
}

// Names a live session may STILL sit under after a deployment changed COOKIE_NAME (default: the
// framework name). Read-only — a token found under a legacy name is accepted so nobody is logged out
// by the rename, but it is never re-written there; the next login/logout moves the session to the
// configured name and clears the old one. Ops can switch the adoption off with COOKIE_NAME_LEGACY="".
export function resolveLegacyCookieNames($config) {
  const configured = $config ? $config.cookieLegacyNames : undefined
  const raw =
    configured === undefined || configured === null ? DEFAULT_COOKIE_NAME : String(configured)
  const current = resolveCookieName($config)
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== current)
}

// Path and SameSite are framework constants: the cookie is read on every route (path '/'), and 'lax'
// is what lets the session survive a top-level navigation back into the app while still blocking
// cross-site POSTs. Only lifetime and the Secure flag are deployment-tunable — a plain-HTTP dev or
// intranet deployment must be able to turn Secure off, or the cookie is silently dropped.
export function resolveCookieAttributes($config) {
  const days = Number($config ? $config.cookieExpireDays : NaN)
  const expireDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_EXPIRE_DAYS
  return {
    path: '/',
    sameSite: 'lax',
    secure: Boolean($config && $config.cookieHttpsOnly),
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
  }
}

/**
 * Build the auth-cookie accessor for one nuxt context (one SSR request, or the browser session).
 * Reads are always fresh — `$cookies.get` re-parses `req.headers.cookie` / `document.cookie` per
 * call — which is what lets login() verify that the cookie it just wrote actually stuck.
 */
export function createAuthCookie(context) {
  const app = (context && context.app) || {}
  const $cookies = (context && context.$cookies) || app.$cookies
  if (!$cookies) {
    // Loud on purpose: without it every request would silently go out unauthenticated. nuxt's
    // `addPlugin` UNSHIFTS, so module plugins run in REVERSE registration order — cookie-universal-nuxt
    // has to be listed AFTER @nuxtjs/apollo in nuxt.config `modules` for $cookies to exist by the time
    // the apollo client config is built.
    throw new Error(
      '[authCookie] $cookies is unavailable — list cookie-universal-nuxt AFTER @nuxtjs/apollo in nuxt.config `modules`',
    )
  }
  const $config = (context && context.$config) || app.$config
  const name = resolveCookieName($config)
  const legacyNames = resolveLegacyCookieNames($config)

  return {
    name,
    legacyNames,
    get() {
      const token = $cookies.get(name)
      if (token) return token
      return legacyNames.map((legacy) => $cookies.get(legacy)).find(Boolean)
    },
    set(token) {
      $cookies.set(name, token, resolveCookieAttributes($config))
    },
    remove() {
      // Legacy names too: a logout must not leave a cookie behind that the read fallback would
      // happily adopt again on the next visit.
      ;[name, ...legacyNames].forEach((cookieName) => $cookies.remove(cookieName, { path: '/' }))
    },
  }
}
