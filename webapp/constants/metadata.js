// Adapter: exposes the shared branding metadata (branding.metadata, typed in
// @ocelot-social/branding) under the SCREAMING_CASE keys the webapp + i18n interpolation expect
// (translations reference {APPLICATION_NAME}, {ORGANIZATION_NAME}, … via `$t(key, metadata)`).
// A brand defines these values in its branding override; this file only re-shapes them, so
// consumers (Logo, registration, apollo/auth cookie name, nuxt.config OG tags, manifest) and the
// locale strings stay unchanged. NOTE: OG_IMAGE / the PWA manifest / THEME_COLOR are consumed at
// BUILD time (nuxt.config → head/@nuxtjs/pwa) — a brand override must be present at build.

import branding from '@ocelot-social/branding'

const { metadata } = branding

export default {
  APPLICATION_NAME: metadata.applicationName,
  APPLICATION_SHORT_NAME: metadata.applicationShortName,
  APPLICATION_DESCRIPTION: metadata.applicationDescription,
  COOKIE_NAME: metadata.cookieName,
  ORGANIZATION_NAME: metadata.organizationName,
  ORGANIZATION_JURISDICTION: metadata.organizationJurisdiction,
  THEME_COLOR: metadata.themeColor,
  OG_IMAGE: metadata.ogImage,
  OG_IMAGE_ALT: metadata.ogImageAlt,
  OG_IMAGE_WIDTH: metadata.ogImageWidth,
  OG_IMAGE_HEIGHT: metadata.ogImageHeight,
  OG_IMAGE_TYPE: metadata.ogImageType,
}
