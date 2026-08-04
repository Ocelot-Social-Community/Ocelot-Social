// Resolve a badge icon URL to something the browser can fetch.
//
// Two sources, because badges come from two places:
//   • BRAND badges ship in the brand archive and are served from it at /branding/<id>/assets/badges/…
//     by server-middleware/branding-assets.js — already an absolute, servable path, so it is passed
//     through untouched. Same discriminator as components/utils/brandingHtml.js.
//   • FRAMEWORK badges (the seeded trophies/verifications) are files in the backend image under
//     public/img/badges/… and reachable only through the /api proxy (nuxt.config.js strips the prefix).
export const backendPath = (url) => {
  if (url.startsWith('/branding/')) return url
  return url.startsWith('/') ? '/api' + url : '/api/' + url
}
