// The icon paths a browser asks for WITHOUT being told to — /favicon.ico when no <link rel="icon">
// applies, /icon.png and /apple-touch-icon*.png as the conventional home-screen names — pointed at the
// active brand's own files.
//
// The declared links are already branded per request (plugins/branding-favicon.js rewrites the hid'd
// slots in <head>), so this is not about the tags. It is about every consumer that never reads them:
// a browser falling back to the well-known path, a crawler, a link-preview bot, a chat client fetching
// /favicon.ico directly. Those all got the framework's own ocelot icon off webapp/static/ — which is
// how a fully branded instance still showed the vanilla logo on a phone, from a file no brand config
// could reach.
//
// A REDIRECT rather than a copy of the bytes: the brand's file is already served, with the right
// content type and caching, by server-middleware/branding-assets.js. Answering here would mean a
// second reader of the archive for no gain.
//
// ORDERING: registered from nuxt.config's `render:setupMiddleware` hook, not via `serverMiddleware`.
// Nuxt mounts serve-static (webapp/static/) BEFORE the configured serverMiddleware list, so an entry
// there would never see a request for a path that exists as a static file — and both of these do.
// The hook fires at the very start of setupMiddleware, ahead of serve-static.
//
// No brand file for a slot → next(), so the framework's static file answers exactly as before. That is
// also what a vanilla instance always gets.
const { getBranding } = require('@ocelot-social/branding')

/** Well-known path → the `assets` key that should answer it. */
const SLOTS = {
  '/favicon.ico': 'favicon',
  // Same file for all three: `icon` is the square raster icon, which is what a home-screen tile wants.
  // The two apple-touch names are what iOS probes for when it finds no link tag; they resolve to
  // nothing today, so pointing them at the brand adds an answer rather than replacing one.
  '/icon.png': 'icon',
  '/apple-touch-icon.png': 'icon',
  '/apple-touch-icon-precomposed.png': 'icon',
}

module.exports = function brandIcons(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  const url = (req.url || '').split('?')[0]
  const slot = SLOTS[url]
  if (!slot) return next()

  // The process-global active brand, the same one server-middleware/manifest.js reads — set per SSR
  // render by plugins/branding.js. An icon request does not go through the render pipeline, so it sees
  // whatever the last render resolved; the active brand is a deployment-wide policy value rather than
  // anything per-visitor, so that is the right answer for every request after the first page.
  const branding = getBranding()
  const href = (branding.assets || {})[slot]
  // A brand pointing a slot back at the well-known path itself would otherwise redirect to itself
  // forever.
  if (!href || href === url) return next()

  res.statusCode = 302
  res.setHeader('Location', href)
  // Not cached, for the same reason the dynamic manifest is not: an admin brand switch has to be
  // picked up. The brand asset the redirect lands on carries its own long max-age — it is namespaced
  // per brand, so it can be.
  res.setHeader('Cache-Control', 'no-cache')
  res.end()
}
