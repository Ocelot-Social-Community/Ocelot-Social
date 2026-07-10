// Load a branding static-page's HTML at runtime from the served branding assets folder, replacing
// the build-bundled i18n html (`$t('html.<page>')`). The path comes from branding.assets.html
// (namespaced to /branding/<id>/… by the multi-brand build) — only such absolute /branding/ paths
// are loaded; anything else (e.g. a non-namespaced dev path, or none) returns null so the caller
// falls back to the i18n html. Server-side reads the file straight off disk from
// $OCELOT_BRANDING_ASSETS_DIR (no self-HTTP); client-side fetches the served URL.
export async function fetchBrandingHtml(src) {
  if (!src || typeof src !== 'string' || !src.startsWith('/branding/')) return null

  // Bare `process.server` so Nuxt's DefinePlugin folds this whole branch (and its Node requires)
  // out of the CLIENT bundle — a compound guard like `typeof process !== 'undefined' && …` is not
  // recognised, so webpack would try to bundle 'fs' for the browser and fail.
  if (process.server) {
    const base = process.env.OCELOT_BRANDING_ASSETS_DIR
    if (!base) return null
    // eslint-disable-next-line global-require, import/no-nodejs-modules
    const { readFileSync } = require('fs')
    // eslint-disable-next-line global-require, import/no-nodejs-modules
    const path = require('path')
    // The middleware serves $OCELOT_BRANDING_ASSETS_DIR at /branding, so strip that mount prefix.
    const rel = src.replace(/^\/branding\//, '')
    const file = path.resolve(base, rel)
    // Path-traversal guard: stay within the served base dir.
    if (file !== base && !file.startsWith(path.resolve(base) + path.sep)) return null
    try {
      return readFileSync(file, 'utf8')
    } catch (error) {
      return null
    }
  }

  try {
    const res = await fetch(src)
    if (!res.ok) return null
    return await res.text()
  } catch (error) {
    return null
  }
}
