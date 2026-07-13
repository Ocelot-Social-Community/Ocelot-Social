// Adapter (LAZY): exposes the shared branding metadata under the SCREAMING_CASE keys the webapp +
// i18n interpolation expect (translations reference {APPLICATION_NAME}, … via `$t(key, metadata)`).
// A Proxy resolves each key against branding.metadata at ACCESS time, so a runtime-injected brand
// config (see plugins/branding.js) is reflected without a rebuild instead of being captured at
// import time. The Proxy exposes plain, configurable+writable descriptors so consumers can still
// spread / clone `metadata` (e.g. specs, i18n). Consumers + locale strings stay unchanged.
// NOTE: OG_IMAGE / the PWA manifest / THEME_COLOR are consumed at BUILD time (nuxt.config →
// head/@nuxtjs/pwa) — those still resolve against the defaults present at build.
import branding, { resolveThemeColor } from '@ocelot-social/branding'

// SCREAMING_CASE consumer key -> branding.metadata camelCase key. THEME_COLOR is special: there is no
// metadata.themeColor field — the browser-chrome / PWA colour is the `color-primary` theme token
// (see resolveThemeColor), so it can't break for partial packages the way the old carve-out did.
const KEY_MAP = {
  APPLICATION_NAME: 'applicationName',
  APPLICATION_SHORT_NAME: 'applicationShortName',
  APPLICATION_DESCRIPTION: 'applicationDescription',
  COOKIE_NAME: 'cookieName',
  ORGANIZATION_NAME: 'organizationName',
  ORGANIZATION_JURISDICTION: 'organizationJurisdiction',
  OG_IMAGE: 'ogImage',
  OG_IMAGE_ALT: 'ogImageAlt',
  OG_IMAGE_WIDTH: 'ogImageWidth',
  OG_IMAGE_HEIGHT: 'ogImageHeight',
  OG_IMAGE_TYPE: 'ogImageType',
}

const KEYS = [...Object.keys(KEY_MAP), 'THEME_COLOR']

// Resolve one SCREAMING_CASE key against the runtime branding config.
function resolve(prop) {
  if (prop === 'THEME_COLOR') return resolveThemeColor(branding.theme.cssVars)
  return prop in KEY_MAP ? branding.metadata[KEY_MAP[prop]] : undefined
}

export default new Proxy(
  {},
  {
    get: (_target, prop) => (typeof prop === 'string' ? resolve(prop) : undefined),
    has: (_target, prop) => typeof prop === 'string' && KEYS.includes(prop),
    ownKeys: () => KEYS,
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string' || !KEYS.includes(prop)) return undefined
      return {
        value: resolve(prop),
        enumerable: true,
        configurable: true,
        writable: true,
      }
    },
  },
)
