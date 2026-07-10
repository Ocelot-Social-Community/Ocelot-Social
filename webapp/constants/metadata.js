// Adapter (LAZY): exposes the shared branding metadata under the SCREAMING_CASE keys the webapp +
// i18n interpolation expect (translations reference {APPLICATION_NAME}, … via `$t(key, metadata)`).
// A Proxy resolves each key against branding.metadata at ACCESS time, so a runtime-injected brand
// config (see plugins/branding.js) is reflected without a rebuild instead of being captured at
// import time. The Proxy exposes plain, configurable+writable descriptors so consumers can still
// spread / clone `metadata` (e.g. specs, i18n). Consumers + locale strings stay unchanged.
// NOTE: OG_IMAGE / the PWA manifest / THEME_COLOR are consumed at BUILD time (nuxt.config →
// head/@nuxtjs/pwa) — those still resolve against the defaults present at build.
import branding from '@ocelot-social/branding'

// SCREAMING_CASE consumer key -> branding.metadata camelCase key.
const KEY_MAP = {
  APPLICATION_NAME: 'applicationName',
  APPLICATION_SHORT_NAME: 'applicationShortName',
  APPLICATION_DESCRIPTION: 'applicationDescription',
  COOKIE_NAME: 'cookieName',
  ORGANIZATION_NAME: 'organizationName',
  ORGANIZATION_JURISDICTION: 'organizationJurisdiction',
  THEME_COLOR: 'themeColor',
  OG_IMAGE: 'ogImage',
  OG_IMAGE_ALT: 'ogImageAlt',
  OG_IMAGE_WIDTH: 'ogImageWidth',
  OG_IMAGE_HEIGHT: 'ogImageHeight',
  OG_IMAGE_TYPE: 'ogImageType',
}

const KEYS = Object.keys(KEY_MAP)

export default new Proxy(
  {},
  {
    get: (_target, prop) =>
      typeof prop === 'string' && prop in KEY_MAP ? branding.metadata[KEY_MAP[prop]] : undefined,
    has: (_target, prop) => typeof prop === 'string' && prop in KEY_MAP,
    ownKeys: () => KEYS,
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string' || !(prop in KEY_MAP)) return undefined
      return {
        value: branding.metadata[KEY_MAP[prop]],
        enumerable: true,
        configurable: true,
        writable: true,
      }
    },
  },
)
