/* eslint-disable n/no-process-env */ // reads the branding env (like config/index.ts)
/* eslint-disable no-catch-all/no-catch-all */ // branding injection must never crash startup — any failure falls back to defaults
// Runtime branding injection (backend). Discovers the deployed brand's archive under
// $OCELOT_BRANDING_ASSETS_DIR (any `*.tar.gz`, recursively) and injects its branding.json via
// setBranding BEFORE the app reads `branding`. Import this FIRST in src/index.ts so module-scope
// reads (e.g. config/index.ts's branding.metadata) see the brand config. The backend brand is
// DEPLOY-PINNED via $OCELOT_ACTIVE_BRANDING (its group limits / e-mail identity don't live-switch,
// unlike the webapp presentation), or — when unset — the image's baked default marker (DEFAULT file,
// written when a brand is baked in as default theme); neither → framework defaults (vanilla image
// runs as-is). This lets a pre-built image be branded without a rebuild — see
// docu/branding-architecture-konzept.md.
import { setBranding } from '@ocelot-social/branding'
// eslint-disable-next-line import-x/no-unresolved -- package subpath (server-only, uses node:fs + node:zlib)
import {
  discoverArchives,
  readArchiveConfig,
  readDefaultMarker,
} from '@ocelot-social/branding/dist/discover.js'

const assetsDir = process.env.OCELOT_BRANDING_ASSETS_DIR
const active = assetsDir
  ? // `||` (not `??`) on purpose: an empty $OCELOT_ACTIVE_BRANDING must fall through to the marker.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    process.env.OCELOT_ACTIVE_BRANDING || readDefaultMarker(assetsDir)
  : undefined
if (assetsDir && active) {
  try {
    const archive = discoverArchives(assetsDir).get(active)
    // Compose the effective config from the archive's instance fragments (manifest + fragments/).
    const config = archive ? readArchiveConfig(archive.file) : null
    if (config) {
      setBranding(config)
    }
  } catch {
    // no archive / unreadable / bad manifest → keep framework defaults
  }
}
