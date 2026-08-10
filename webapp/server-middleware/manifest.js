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
  const assets = branding.assets || {}
  // `assets.icon` first — the square raster icon a brand ships for exactly this (and for
  // apple-touch-icon). ogImage stays the fallback it used to be, but it is a SHARE image: sized for a
  // link preview (1200×1140 by default) rather than an install icon, and often an .svg, which several
  // browsers refuse in a manifest. A brand that sets neither still ends up with no icons — what the
  // empty array below already meant.
  const icon = assets.icon || metadata.ogImage
  // WHICH of the two we ended up with. Everything the manifest goes on to declare about the file — its
  // type, its size — is only true of the one it actually picked, so both read this rather than guess.
  const fromSlot = Boolean(assets.icon)
  // Derived from the path rather than taken from metadata.ogImageType: that field describes the OG
  // image, and it would mislabel `assets.icon` whenever the two are different files. When the path
  // says nothing — an icon served by a route, with no extension to read — the slot is left with NO
  // type rather than the OG image's: `type` is optional in a manifest icon, an absent one lets the
  // browser sniff the file, and a wrong one invites it to discard the candidate outright (the same
  // reasoning as utils/iconType.js returning undefined for an extension it does not know). The
  // ogImage fallback keeps the historical guess, because there ogImageType does describe the file.
  const type = iconType(icon) || (fromSlot ? undefined : metadata.ogImageType || 'image/png')
  // The measured size of `assets.icon`, written by the branding build (assets.iconSizes) — and ONLY
  // for that slot: the ogImage fallback is a different file that nothing measured, so its declaration
  // stays the historical 192/512 guess below.
  const sizes = fromSlot ? assets.iconSizes : null
  // A manifest icon has to be RASTER. The type is derived from the path, so an .svg here is published
  // as image/svg+xml — and browsers that will not rasterise a manifest icon drop it, which for a brand
  // whose only candidate is its squared logo means installing under no icon at all rather than under
  // the wrong one. Dropping it here is the same outcome, minus the claim that we shipped one.
  const raster = type !== 'image/svg+xml'

  const body = {
    name: metadata.applicationName,
    short_name: metadata.applicationShortName,
    description: metadata.applicationDescription,
    // The browser-chrome colour = the brand's `color-primary` theme token (no field of its own).
    theme_color: resolveThemeColor(branding.theme),
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    lang: 'en',
    // One entry when the size is KNOWN — a browser scales a single honest candidate to whatever slot
    // it needs, and repeating the same file under a second, contradicting `sizes` only invites it to
    // be discarded. The unmeasured fallback keeps the 192/512 pair: with nothing to declare, covering
    // both slots is the best guess available.
    icons:
      !icon || !raster
        ? []
        : sizes
          ? [{ src: icon, sizes, type }]
          : [
              { src: icon, sizes: '192x192', type },
              { src: icon, sizes: '512x512', type },
            ],
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-cache')
  res.end(JSON.stringify(body))
}
