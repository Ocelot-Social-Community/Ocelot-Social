// ATTENTION: DO NOT PUT ANY SECRETS IN HERE (or the .env)

import dotenv from 'dotenv'
dotenv.config() // we want to synchronize @nuxt-dotenv and nuxt-env

// Load Package Details for some default values
const pkg = require('../package')
const metadata = require('../constants/metadata.js')

// Build version from git describe (e.g. "3.14.0-12-gabcdef" → "3.14.0+12")
const BUILD_VERSION = (() => {
  try {
    const desc = require('child_process')
      .execSync('git describe --tags --match "[0-9]*"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
      .trim()
    const match = desc.match(/^(.+)-(\d+)-g[0-9a-f]+$/)
    return match ? `${match[1]}+${match[2]}` : desc
  } catch {
    return null
  }
})()

// Env vars are strings; these give the two typed cookie settings their real type (see below).
const toPositiveNumber = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

const toBoolean = (value, fallback) => {
  if (value === undefined || value === '') return fallback
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase())
}

const environment = {
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.NODE_ENV !== 'production' || false,
  PRODUCTION: process.env.NODE_ENV === 'production' || false,
  NUXT_BUILD: process.env.NUXT_BUILD || '.nuxt',
}

const server = {
  GRAPHQL_URI: process.env.GRAPHQL_URI || 'http://localhost:4000',
  WEBSOCKETS_URI: process.env.WEBSOCKETS_URI || 'ws://localhost:3000/api/graphql',
}

const sentry = {
  SENTRY_DSN_WEBAPP: process.env.SENTRY_DSN_WEBAPP,
  COMMIT: process.env.COMMIT,
}

const options = {
  VERSION: process.env.VERSION || BUILD_VERSION || pkg.version,
  DESCRIPTION:
    process.env.DESCRIPTION ||
    (metadata.default || metadata).APPLICATION_DESCRIPTION ||
    pkg.description,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  // Cookies. These three reach the app through publicRuntimeConfig (see nuxt.config.js), NOT through
  // the DefinePlugin-inlined `env` — nuxt.config.js is re-evaluated when the server starts, so they
  // are DEPLOYMENT values: settable per instance (Helm `webapp.env.*` → pod env) on the shared,
  // pre-built webapp image. utils/authCookie.js explains why the cookie cannot use @nuxtjs/apollo's
  // own (build-baked) token name.
  //
  // Name of the auth cookie holding the JWT. Deliberately NOT a branding value: it is infra, and a
  // brand switched at runtime must not invalidate every session. Cookies are host-only here (no
  // `domain` attribute), so no per-instance namespacing is needed — the default fits everyone.
  COOKIE_NAME: process.env.COOKIE_NAME || 'ocelot-social-token',
  // Comma-separated predecessor name(s): a session found under one of these is ADOPTED instead of
  // dropped, so renaming COOKIE_NAME does not log everyone out. Defaults to the framework name;
  // set to "" to switch the adoption off.
  COOKIE_NAME_LEGACY: process.env.COOKIE_NAME_LEGACY,
  // Numbers/booleans, not strings: an env var arrives as a string, and `expires: '30'` would produce
  // a session cookie while COOKIE_HTTPS_ONLY="false" would be truthy and force Secure on plain HTTP.
  COOKIE_EXPIRE_TIME: toPositiveNumber(process.env.COOKIE_EXPIRE_TIME, 730), // Two years by default
  COOKIE_HTTPS_ONLY: toBoolean(
    process.env.COOKIE_HTTPS_ONLY,
    process.env.NODE_ENV === 'production',
  ), // ensure true in production if not set explicitly
  // The network-policy flags (BADGES_ENABLED, ASK_FOR_REAL_NAME, REQUIRE_LOCATION,
  // INVITE_LINK_LIMIT, INVITE_CODES_*, MAX_PINNED_POSTS, MAX_GROUP_PINNED_POSTS,
  // API_KEYS_MAX_PER_USER) moved to the runtime network policy (read via $policy.get).
  NETWORK_NAME: process.env.NETWORK_NAME || 'Ocelot.social',
}

const language = {
  LANGUAGE_DEFAULT: process.env.LANGUAGE_DEFAULT || 'en',
  LANGUAGE_FALLBACK: process.env.LANGUAGE_FALLBACK || 'en',
}

// Support contact address — set per deployment via env. In CONFIG so nuxt-env exposes it at
// runtime as `$env.SUPPORT_EMAIL` (same channel as NETWORK_NAME); default mirrors the backend's
// software default. The organisation/support LINKS live only in the backend (email templates) —
// the webapp's footer links come from ~/constants/links, so they are not duplicated here.
const organization = {
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'hello@ocelot.social',
}

// How long a toast stays on screen, in milliseconds (iziToast's own default is 5000). In CONFIG so
// nuxt-env exposes it at runtime as `$env.TOAST_TIMEOUT` — same channel as SUPPORT_EMAIL — which is
// what lets the e2e stack raise it on the pre-built image (docker-compose.test.yml).
//
// It has to be raisable because a toast is the only evidence some Cypress steps have that an action
// succeeded, and asserting on it is a race against this timeout: any wait between the action and the
// assertion (`cy.waitForNetworkIdle` in the policy steps, for instance) eats into the window, and a
// toast that has already auto-dismissed is indistinguishable from one that never appeared.
const notifications = {
  TOAST_TIMEOUT: toPositiveNumber(process.env.TOAST_TIMEOUT, 5000),
}

const CONFIG = {
  ...environment,
  ...server,
  ...sentry,
  ...options,
  ...language,
  ...organization,
  ...notifications,
}

// override process.env with the values here since they contain default values
process.env = {
  ...process.env,
  ...CONFIG,
}

export default CONFIG
