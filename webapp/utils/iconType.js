// The MIME type of an icon asset, derived from its path.
//
// CommonJS, unlike the rest of utils/: both consumers are on different module systems and neither can
// be moved. plugins/branding-favicon.js is an ESM plugin bundled by webpack (which interops CJS
// fine), while server-middleware/manifest.js is required by Node at runtime and cannot `import`.
// Duplicating the table was the alternative, and a favicon announced as one type in <head> and
// another in the manifest is exactly the sort of drift that survives review.
//
// A brand's `assets.favicon` / `assets.icon` are free-form paths (packages/branding schema.ts), so an
// extension we do not recognise yields NOTHING rather than a guess: an absent type lets the browser
// sniff the file, while a wrong one can make it discard the icon outright.
const ICON_TYPES = {
  ico: 'image/x-icon',
  png: 'image/png',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** The MIME type for an icon href, or undefined when the extension says nothing useful. */
function iconType(href) {
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(String(href || ''))
  return match ? ICON_TYPES[match[1].toLowerCase()] : undefined
}

module.exports = { ICON_TYPES, iconType }
