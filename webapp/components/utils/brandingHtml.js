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
    // eslint-disable-next-line global-require, import/no-unresolved
    const {
      discoverArchives,
      readArchive,
      isValidBrandId,
    } = require('@ocelot-social/branding/dist/discover.js')
    // src is '/branding/<id>/html/<locale>/<file>.html'; read the entry from that brand's archive.
    const rel = src.replace(/^\/branding\//, '')
    const slash = rel.indexOf('/')
    if (slash === -1) return null
    const id = rel.slice(0, slash)
    const entry = rel.slice(slash + 1)
    if (!isValidBrandId(id)) return null
    try {
      const archive = discoverArchives(base).get(id)
      if (!archive) return null
      const files = readArchive(archive.file)
      const data = files && files.get(entry)
      return data ? data.toString('utf8') : null
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
