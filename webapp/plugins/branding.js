// Runtime branding injection (webapp). Server: load the active brand's compiled config (JSON — the
// serialised result of `defineBranding({...})`) and inject it via setBranding, then serialise it to
// the client. Client: read the serialised config and inject it. No brand → framework defaults
// (vanilla runs as-is). Lets a pre-built image be branded without a rebuild — see
// docu/branding-architecture-konzept.md (runtime accessor).
//
// Two source modes (checked in order):
//   1. $OCELOT_BRANDING_PATH — a single compiled branding.json (dev / single-brand). Simple.
//   2. $OCELOT_BRANDING_ASSETS_DIR — the served multi-brand folder (manifest.json + <id>/…). The
//      ACTIVE brand is the `activeBranding` policy value (queried from the backend so SSR renders
//      the switched brand); '' = framework defaults (vanilla), which is the DEFAULT. Baked-in
//      brandings are only made AVAILABLE (listed for the admin Branding tab), never auto-activated
//      — ops may pin a default with $OCELOT_ACTIVE_BRANDING (used only when the backend is
//      unreachable). The chosen <id>/branding.json is loaded + serialised together with its id
//      (window.__NUXT__.brandingId) so the live-switch plugin can detect a divergence and reload.
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

// `readFileSync` + `path` are passed in from the server-only branch (required there under a bare
// `process.server` guard) so no Node require lives in this always-bundled function — otherwise
// webpack would try to resolve 'fs' for the client bundle and fail.
async function loadServerBranding(readFileSync, path, readTarGz) {
  const brandingPath = process.env.OCELOT_BRANDING_PATH
  if (brandingPath) {
    const config = JSON.parse(readFileSync(brandingPath, 'utf8'))
    return { config, brandingId: '' }
  }

  const assetsDir = process.env.OCELOT_BRANDING_ASSETS_DIR
  if (!assetsDir) return null

  let manifest = []
  try {
    manifest = JSON.parse(readFileSync(path.join(assetsDir, 'manifest.json'), 'utf8'))
  } catch (error) {
    manifest = []
  }
  const ids = Array.isArray(manifest) ? manifest.map((m) => m.id) : []
  if (!ids.length) return null

  // The active brand is the activeBranding policy value ('' = framework defaults / vanilla, which
  // is the DEFAULT). Baked-in brandings are only AVAILABLE (listed in the manifest, switchable on
  // the admin Branding tab), never auto-activated — even a sole brand stays inactive until an admin
  // switches to it (or ops pins one via $OCELOT_ACTIVE_BRANDING). This keeps a fresh instance on
  // vanilla while making brands available to switch to.
  let active = await fetchActiveBrandingId() // '' = vanilla (default), null = backend unreachable
  if (active === null) active = process.env.OCELOT_ACTIVE_BRANDING || ''
  if (!active || !ids.includes(active)) return null // vanilla / unknown → framework defaults

  // Read the active brand's branding.json from its archive (<id>.tar.gz).
  const files = readTarGz(readFileSync(path.join(assetsDir, `${active}.tar.gz`)))
  const config = JSON.parse(files.get('branding.json').toString('utf8'))
  return { config, brandingId: active }
}

export default async (context) => {
  if (process.server) {
    // Node modules required here, inside the bare `process.server` guard, so Nuxt's DefinePlugin
    // folds them out of the client bundle. Passed into loadServerBranding (see its note).
    // eslint-disable-next-line global-require, import/no-nodejs-modules
    const { readFileSync } = require('fs')
    // eslint-disable-next-line global-require, import/no-nodejs-modules
    const path = require('path')
    // Package subpath (server-only, uses node:zlib) — required under the guard so it stays out of
    // the client bundle.
    // eslint-disable-next-line global-require, import/no-unresolved
    const { readTarGz } = require('@ocelot-social/branding/dist/tar.js')
    try {
      const loaded = await loadServerBranding(readFileSync, path, readTarGz)
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
