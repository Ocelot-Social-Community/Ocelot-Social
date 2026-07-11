// Runtime branding injection (webapp). Server: load the active brand's compiled config (JSON — the
// serialised result of `defineBranding({...})`) and inject it via setBranding, then serialise it to
// the client. Client: read the serialised config and inject it. No brand → framework defaults
// (vanilla runs as-is). Lets a pre-built image be branded without a rebuild — see
// docu/branding-architecture-konzept.md (runtime accessor).
//
// Source: $OCELOT_BRANDING_ASSETS_DIR — brand archives (`*.tar.gz`) discovered RECURSIVELY beneath it
// (a flat folder or the deployment/configurations tree; see the package's discover module). The active
// brand resolves in order: `activeBranding` policy value (queried from the backend so SSR renders the
// switched brand) → ops pin $OCELOT_ACTIVE_BRANDING → the image's baked default marker (DEFAULT
// file, written when a brand is baked in as default theme) → '' (framework defaults / vanilla). A
// non-empty policy value always wins (admin live-switch); otherwise the pin / baked default applies,
// so a default-brand image renders branded out of the box while brands stay switchable. The chosen
// brand's branding.json is read FROM its archive and serialised together with its id
// (window.__NUXT__.brandingId) so the live-switch plugin can detect a divergence and reload.
//
// NOTE: plugins run after the app bundle evaluates, so component/method reads pick up the brand
// config; module-scope captures in a few constants adapters (links, metadata) resolve at import
// time and would need the config set earlier (or lazy adapters) for full effect.
import { setBranding } from '@ocelot-social/branding'

// Ask the backend for the current activeBranding policy value (public key, so no auth needed).
// Returns the id string ('' = vanilla), or null when the backend could not be reached (→ the
// caller falls back to env / single-brand). Server-only.
async function fetchActiveBrandingId() {
  const uri = process.env.GRAPHQL_URI || 'http://localhost:4000'
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), 2000) : null
  try {
    const res = await fetch(uri, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ policy { key value } }' }),
      signal: controller ? controller.signal : undefined,
    })
    const json = await res.json()
    const entry = (json && json.data && json.data.policy ? json.data.policy : []).find(
      (e) => e && e.key === 'activeBranding',
    )
    if (!entry || entry.value == null) return ''
    return JSON.parse(entry.value) // JSON-encoded string, e.g. "\"stage\"" → "stage"
  } catch (error) {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// `discover` (the package's server-only archive discovery) is passed in from the server-only branch
// (required there under a bare `process.server` guard) so no Node require lives in this always-bundled
// function — otherwise webpack would try to resolve 'fs' for the client bundle and fail.
async function loadServerBranding(discover) {
  const assetsDir = process.env.OCELOT_BRANDING_ASSETS_DIR
  if (!assetsDir) return null

  // Available brands = the archives actually discovered (recursively; no static manifest to drift).
  const archives = discover.discoverArchives(assetsDir)
  if (!archives.size) return null

  // Resolve the active brand in order: activeBranding policy value → ops pin
  // ($OCELOT_ACTIVE_BRANDING) → the image's baked default marker (a brand baked in as default
  // theme) → '' (framework defaults / vanilla). A non-empty policy value always wins (an admin
  // switching to another brand takes effect live); '' from the policy falls through to the pin /
  // baked default, so a default-brand image renders branded out of the box while any brand stays
  // switchable on the admin Branding tab.
  const policyId = await fetchActiveBrandingId() // '' = vanilla, id = pinned, null = unreachable
  let active = policyId && policyId !== '' ? policyId : ''
  if (!active) {
    active = process.env.OCELOT_ACTIVE_BRANDING || discover.readDefaultMarker(assetsDir) || ''
  }
  const archive = active && archives.get(active)
  if (!archive) return null // vanilla / unknown → framework defaults

  // Read the active brand's branding.json from its archive.
  const files = discover.readArchive(archive.file)
  const config = JSON.parse(files.get('branding.json').toString('utf8'))
  return { config, brandingId: active }
}

export default async (context) => {
  if (process.server) {
    // Package subpath (server-only, uses node:fs + node:zlib) required here, inside the bare
    // `process.server` guard, so Nuxt's DefinePlugin folds it out of the client bundle.
    // eslint-disable-next-line global-require, import/no-unresolved
    const discover = require('@ocelot-social/branding/dist/discover.js')
    try {
      const loaded = await loadServerBranding(discover)
      if (loaded) {
        setBranding(loaded.config)
        context.beforeNuxtRender(({ nuxtState }) => {
          nuxtState.branding = loaded.config
          nuxtState.brandingId = loaded.brandingId
        })
      }
    } catch (error) {
      // any failure (missing / unreadable / bad JSON) → keep framework defaults
    }
  } else if (window.__NUXT__ && window.__NUXT__.branding) {
    setBranding(window.__NUXT__.branding)
  }
}
