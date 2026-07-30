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
  // Cookies
  COOKIE_EXPIRE_TIME: process.env.COOKIE_EXPIRE_TIME || 730, // Two years by default
  COOKIE_HTTPS_ONLY: process.env.COOKIE_HTTPS_ONLY || process.env.NODE_ENV === 'production', // ensure true in production if not set explicitly
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

const CONFIG = {
  ...environment,
  ...server,
  ...sentry,
  ...options,
  ...language,
  ...organization,
}

// override process.env with the values here since they contain default values
process.env = {
  ...process.env,
  ...CONFIG,
}

export default CONFIG
