// ATTENTION: DO NOT PUT ANY SECRETS IN HERE (or the .env)

import dotenv from 'dotenv'
dotenv.config() // we want to synchronize @nuxt-dotenv and nuxt-env

// Load Package Details for some default values
const pkg = require('../package')

const environment = {
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.NODE_ENV !== 'production' || false,
  PRODUCTION: process.env.NODE_ENV === 'production' || false,
  NUXT_BUILD: process.env.NUXT_BUILD || '.nuxt',
  STYLEGUIDE_DEV: process.env.STYLEGUIDE_DEV || false,
}

const server = {
  GRAPHQL_URI: process.env.GRAPHQL_URI || 'http://localhost:4000',
  BACKEND_TOKEN: process.env.BACKEND_TOKEN || 'NULL',
  WEBSOCKETS_URI: process.env.WEBSOCKETS_URI || 'ws://localhost:3000/api/graphql',
}

const sentry = {
  SENTRY_DSN_WEBAPP: process.env.SENTRY_DSN_WEBAPP,
  COMMIT: process.env.COMMIT,
}

const options = {
  VERSION: process.env.VERSION || pkg.version,
  DESCRIPTION: process.env.DESCRIPTION || pkg.description,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  PUBLIC_REGISTRATION: process.env.PUBLIC_REGISTRATION === 'true' || false,
  INVITE_REGISTRATION: process.env.INVITE_REGISTRATION !== 'false', // default = true
  // Cookies
  COOKIE_EXPIRE_TIME: process.env.COOKIE_EXPIRE_TIME || 730, // Two years by default
  COOKIE_HTTPS_ONLY: process.env.COOKIE_HTTPS_ONLY || process.env.NODE_ENV === 'production', // ensure true in production if not set explicitly
  CATEGORIES_ACTIVE: process.env.CATEGORIES_ACTIVE === 'true' || false,
  BADGES_ENABLED: process.env.BADGES_ENABLED === 'true' || false,
  INVITE_LINK_LIMIT: process.env.INVITE_LINK_LIMIT || 7,
}

const meta = {
  APPLICATION_NAME: process.env.APPLICATION_NAME ?? 'ocelot.social',
  APPLICATION_SHORT_NAME: process.env.APPLICATION_SHORT_NAME ?? 'ocelot.social',
  APPLICATION_DESCRIPTION: process.env.APPLICATION_DESCRIPTION ?? 'ocelot.social Community Network',
  COOKIE_NAME: process.env.COOKIE_NAME ?? 'ocelot-social-token',
  ORGANIZATION_NAME: process.env.ORGANIZATION_NAME ?? 'ocelot.social Community',
  ORGANIZATION_JURISDICTION: process.env.ORGANIZATION_JURISDICTION ?? 'City of Angels',
  THEME_COLOR: process.env.THEME_COLOR ?? 'rgb(23, 181, 63)', // $color-primary – as the main color in general. e.g. the color in the background of the app that is visible behind the transparent iPhone status bar to name one use case, or the current color of SVGs to name another use case
}

const language = {
  LANGUAGE_DEFAULT: process.env.LANGUAGE_DEFAULT || 'en',
  LANGUAGE_FALLBACK: process.env.LANGUAGE_FALLBACK || 'en',
}

const CONFIG = {
  ...environment,
  ...server,
  ...sentry,
  ...options,
  ...language,
  ...meta,
}

// override process.env with the values here since they contain default values
process.env = {
  ...process.env,
  ...CONFIG,
}

export default CONFIG
