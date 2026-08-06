// Dynamic PWA manifest, generated per request from the ACTIVE brand's metadata (getBranding, the
// runtime accessor set by the SSR branding plugin). This replaces the static build-time manifest
// (@nuxtjs/pwa `manifest: false`) so the installed-app name / short name / description / theme colour
// follow a live brand switch WITHOUT a rebuild. The <link rel="manifest"> href is fixed
// (/manifest.webmanifest); only the served content is dynamic. Served no-cache so a switch is picked
// up. (Icons follow the brand's square image via metadata.ogImage; a brand that wants its own PWA
// icon points ogImage at its squared asset.)
const { getBranding, resolveThemeColor } = require('@ocelot-social/branding')

module.exports = function manifest(req, res) {
  const branding = getBranding()
  const { metadata } = branding
  const icon = metadata.ogImage
  const iconType = metadata.ogImageType || 'image/png'

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
          { src: icon, sizes: '192x192', type: iconType },
          { src: icon, sizes: '512x512', type: iconType },
        ]
      : [],
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-cache')
  res.end(JSON.stringify(body))
}
