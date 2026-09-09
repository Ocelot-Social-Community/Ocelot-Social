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

// Explicit "framework defaults" as a BASE. '' cannot express it: an unset policy value is also '',
// and that has to keep falling through to the ops pin / baked DEFAULT marker. Same sentinel the
// per-slot composition already uses (the package's parseSource() resolves it to "no source").
const VANILLA_BASE = '@default'

// Unwrap one policy key's transported value (JSON-encoded); '' when absent/garbled.
function extractPolicy(policy, key) {
  const entry = policy.find((e) => e && e.key === key)
  if (!entry || entry.value == null) return ''
  try {
    return JSON.parse(entry.value) // e.g. "\"stage\"" → "stage"
  } catch (error) {
    return ''
  }
}

// Ask the backend for the branding policy (public keys, no auth): the base brand (`activeBranding`)
// and the per-slot composition (`brandingComposition`, a JSON string). Returns { active, composition }
// (composition = the RAW json string as stored), or null when the backend could not be reached (→ the
// caller falls back to env / baked default). Server-only.
// A mistyped bound must not silently DISABLE what it configures. setTimeout coerces both NaN
// (`Number('2s')`) and a negative delay to 0, so the abort would fire before the request is even sent
// and EVERY server render would fall back to the ops pin — indistinguishable in the page from "no
// brand switched". Anything that is not a finite, non-negative number is therefore ignored in favour
// of the default; 0 stays meaningful and means "no bound" (same reading as the sync middleware's
// $OCELOT_BRANDING_SYNC_TIMEOUT_MS).
function boundMs(raw, fallback) {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

// What of the endpoint may appear in a log line. The endpoint itself STAYS — it is the point of these
// warnings, a GRAPHQL_URI pointing at the wrong host is invisible without it — but the two parts that
// can carry a credential are dropped: userinfo (https://user:pass@host) and the query/fragment. A
// value that does not parse as a URL is logged verbatim: it cannot have been sent anywhere, and
// hiding it would hide the very misconfiguration being reported.
function safeUri(uri) {
  try {
    const parsed = new URL(uri)
    // Rebuilt from the safe parts rather than blanked on the URL object, so the line reads exactly
    // like the configured value (`toString()` would normalise a bare origin to a trailing slash).
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.protocol}//${parsed.host}${path}`
  } catch (error) {
    return uri
  }
}

async function fetchBrandingPolicy(uri) {
  const endpoint = safeUri(uri)
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeout = boundMs(process.env.OCELOT_BRANDING_POLICY_TIMEOUT_MS, 2000)
  const timer = controller && timeout ? setTimeout(() => controller.abort(), timeout) : null
  try {
    const res = await fetch(uri, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ policy { key value } }' }),
      signal: controller ? controller.signal : undefined,
    })
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[branding] policy query to ${endpoint} answered HTTP ${res.status} — using fallback`,
      )
      return null
    }
    const json = await res.json()
    const policy = json && json.data && json.data.policy ? json.data.policy : []
    return {
      active: extractPolicy(policy, 'activeBranding') || '',
      composition: extractPolicy(policy, 'brandingComposition') || '',
    }
  } catch (error) {
    // MUST be loud. A failure here is indistinguishable in the rendered page from "no brand switched":
    // the caller falls through to $OCELOT_ACTIVE_BRANDING / the baked DEFAULT marker and serves the
    // image's brand, so an unreachable backend silently overrides every admin branding choice. That is
    // exactly how a misconfigured GRAPHQL_URI hid itself: the browser reaches the backend through the
    // ingress and shows the real policy, while SSR never got it.
    // eslint-disable-next-line no-console
    console.warn(
      `[branding] policy query to ${endpoint} failed (${error && error.name === 'AbortError' ? `no answer within ${timeout}ms` : (error && error.message) || error}) — falling back to $OCELOT_ACTIVE_BRANDING / the baked default; the active branding and its composition will be IGNORED`,
    )
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// `discover` (the package's server-only archive discovery) is passed in from the server-only branch
// (required there under a bare `process.server` guard) so no Node require lives in this always-bundled
// function — otherwise webpack would try to resolve 'fs' for the client bundle and fail.
async function loadServerBranding(discover, graphqlUri) {
  // Sync cache first, then the baked/mounted archives; neither env var needs setting (see
  // discover.cacheFirstSearchPath) — unset means the conventional locations, not "no branding".
  const assetsDir = discover.cacheFirstSearchPath(
    process.env.OCELOT_BRANDING_CACHE_DIR,
    process.env.OCELOT_BRANDING_ASSETS_DIR,
  )

  // Available brands = the archives actually discovered (recursively; no static manifest to drift).
  const archives = discover.discoverArchives(assetsDir)
  if (!archives.size) return null

  // Resolve the BASE brand in order: activeBranding policy value → ops pin ($OCELOT_ACTIVE_BRANDING)
  // → the image's baked default marker → '' (framework defaults / vanilla). A non-empty policy value
  // wins; '' falls through to the pin / baked default, so a default-brand image renders branded out
  // of the box while any brand stays switchable on the admin Branding tab.
  const policy = await fetchBrandingPolicy(graphqlUri) // { active, composition } or null (unreachable)
  const policyActive = policy ? policy.active : ''
  let base
  if (policyActive === VANILLA_BASE) {
    // An admin explicitly chose "no branding". This must NOT fall through: on an image that bakes a
    // default brand the marker would win every time, making the choice unreachable — the page would
    // reload once and keep rendering the baked brand.
    base = ''
  } else if (policyActive) {
    base = policyActive
  } else {
    // Nothing chosen (yet) → ops pin, then the image's baked default, then vanilla.
    base = process.env.OCELOT_ACTIVE_BRANDING || discover.readDefaultMarker(assetsDir) || ''
  }
  if (base && !archives.has(base)) base = '' // unknown base id → vanilla base

  // Warn (server log) when the resolved base archive was built against a different branding SCHEMA
  // than this webapp runtime — a newer archive may reference config the app can't render; older just
  // misses new fields. Never fatal.
  if (base) {
    const compat = discover.checkSchemaCompat(archives.get(base).schemaVersion)
    if (compat !== 'ok') {
      // eslint-disable-next-line no-console
      console.warn(
        `[branding] ${discover.describeSchemaCompat(compat, archives.get(base).schemaVersion) || ''}`,
      )
    }
  }

  // Per-slot overrides layered over the base (theme of one brand + identity of another, …).
  const rawComposition = (policy && policy.composition) || ''
  let composition = {}
  if (rawComposition) {
    try {
      const parsed = JSON.parse(rawComposition)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) composition = parsed
    } catch (error) {
      composition = {}
    }
  }
  const hasComposition = Object.keys(composition).length > 0

  // Nothing to brand → framework defaults (vanilla). Returning null makes the caller setBranding
  // (undefined) — important so a vanilla request never renders a brand a prior request leaked.
  if (!base && !hasComposition) return null

  // Compose the effective config across archives: each slot from its map source, `_default` = base.
  const config = discover.composeComposition(assetsDir, { _default: base, ...composition })
  if (!config) return null
  // brandingId = resolved base, brandingComposition = the raw json — together the reload SIGNATURE the
  // live-switch plugin compares against the current policy to detect a change.
  return { config, brandingId: base, brandingComposition: rawComposition }
}

export default async (context) => {
  if (process.server) {
    // Package subpath (server-only, uses node:fs + node:zlib) required here, inside the bare
    // `process.server` guard, so Nuxt's DefinePlugin folds it out of the client bundle.
    const discover = require('@ocelot-social/branding/dist/discover.js')
    try {
      // From privateRuntimeConfig (evaluated at server START), NOT from process.env: the latter is
      // frozen into the bundle by DefinePlugin at build time and would always be the localhost default.
      const graphqlUri =
        (context.$config && context.$config.graphqlUri) ||
        process.env.GRAPHQL_URI ||
        'http://localhost:4000'
      const loaded = await loadServerBranding(discover, graphqlUri)
      // ALWAYS set this request's effective branding — even to undefined (vanilla). The accessor
      // stores the active brand in a process-global (globalThis.__OCELOT_BRANDING__) shared across
      // SSR requests, so a vanilla request that skipped setBranding would inherit whatever brand a
      // PRIOR request left there. After switching the active brand back to default, the server would
      // then render the stale brand (e.g. its shorter footer link list) while the client, receiving
      // no serialised branding, renders the framework default → a hydration mismatch that bails
      // hydration into a full client re-render. Resetting to undefined pins vanilla for this request.
      setBranding(loaded ? loaded.config : undefined)
      if (loaded) {
        context.beforeNuxtRender(({ nuxtState }) => {
          nuxtState.branding = loaded.config
          nuxtState.brandingId = loaded.brandingId
          nuxtState.brandingComposition = loaded.brandingComposition
        })
      }
    } catch (error) {
      // any failure (missing / unreadable / bad JSON) → vanilla, and clear any brand a prior request
      // may have left in the shared process-global (so SSR doesn't render a stale, leaked brand).
      setBranding(undefined)
    }
  } else if (window.__NUXT__ && window.__NUXT__.branding) {
    setBranding(window.__NUXT__.branding)
  }
}
