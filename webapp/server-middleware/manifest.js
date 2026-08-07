// Dynamic PWA manifest, generated per request from the ACTIVE brand's metadata (getBranding, the
// runtime accessor set by the SSR branding plugin). This replaces the static build-time manifest
// (@nuxtjs/pwa `manifest: false`) so the installed-app name / short name / description / theme colour
// follow a live brand switch WITHOUT a rebuild. The <link rel="manifest"> href is fixed
// (/manifest.webmanifest); only the served content is dynamic. Served no-cache so a switch is picked
// up.
const { getBranding, resolveThemeColor } = require('@ocelot-social/branding')

const { iconType } = require('../utils/iconType.js')

module.exports = function manifest(req, res) {
  const branding = getBranding()
  const { metadata } = branding
  // `assets.icon` first — the square raster icon a brand ships for exactly this (and for
  // apple-touch-icon). ogImage stays the fallback it used to be, but it is a SHARE image: sized for a
  // link preview (1200×1140 by default) rather than an install icon, and often an .svg, which several
  // browsers refuse in a manifest. A brand that sets neither still ends up with no icons — what the
  // empty array below already meant.
  const icon = (branding.assets && branding.assets.icon) || metadata.ogImage
  // Derived from the path rather than taken from metadata.ogImageType: that field describes the OG
  // image, and it would mislabel `assets.icon` whenever the two are different files.
  const type = iconType(icon) || metadata.ogImageType || 'image/png'

  const body = {
    name: metadata.applicationName,
    short_name: metadata.applicationShortName,
    description: metadata.applicationDescription,
    // The browser-chrome colour = the brand's primary colour (no separate metadata.themeColor field).
    theme_color: resolveThemeColor(branding.theme),
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    lang: 'en',
    icons: icon
      ? [
          { src: icon, sizes: '192x192', type },
          { src: icon, sizes: '512x512', type },
        ]
      : [],
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-cache')
  res.end(JSON.stringify(body))
}
