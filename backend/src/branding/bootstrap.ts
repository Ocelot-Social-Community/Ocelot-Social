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
import path from 'node:path'

import { checkSchemaCompat, describeSchemaCompat, setBranding } from '@ocelot-social/branding'
import {
  discoverArchives,
  readArchive,
  readArchiveConfig,
  readDefaultMarker,
  searchPath,
} from '@ocelot-social/branding/dist/discover.js'

import { overlayBrandRuntimeFiles } from './overlayRuntimeFiles'

// No env needed: unset falls back to the conventional archive locations (deployment/configurations,
// in the image and in a repo checkout — see discover.DEFAULT_ROOTS). Setting the var replaces them.
const assetsDir = searchPath(process.env.OCELOT_BRANDING_ASSETS_DIR)
// `||` (not `??`) on purpose: an empty $OCELOT_ACTIVE_BRANDING must fall through to the marker.
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
const active = process.env.OCELOT_ACTIVE_BRANDING || readDefaultMarker(assetsDir)
if (active) {
  try {
    const archive = discoverArchives(assetsDir).get(active)
    if (archive) {
      // Warn when the archive was built against a different branding SCHEMA than this runtime — a
      // newer archive may reference config this backend doesn't understand; older just misses new
      // fields (compose falls back to defaults). Never fatal — the config still loads.
      const compat = checkSchemaCompat(archive.schemaVersion)
      if (compat !== 'ok') {
        // eslint-disable-next-line no-console
        console.warn(`[branding] ${describeSchemaCompat(compat, archive.schemaVersion) ?? ''}`)
      }
    } else {
      // A brand was requested (env / DEFAULT marker) but no matching archive was discovered — log it
      // so an unexpectedly unbranded backend is traceable instead of failing silently.
      // eslint-disable-next-line no-console
      console.warn(
        `[branding] active brand "${active}" not found under ${assetsDir.join(', ')} — running on framework defaults.`,
      )
    }
    // Compose the effective config from the archive's instance fragments (manifest + fragments/).
    const config = archive ? readArchiveConfig(archive.file) : null
    if (config) {
      setBranding(config)
    } else if (archive) {
      // eslint-disable-next-line no-console
      console.warn(
        `[branding] archive for "${active}" (${archive.file}) has no readable config — running on framework defaults.`,
      )
    }
    // Overlay the brand's e-mail templates/locales from the same archive — replaces the old ONBUILD
    // build-time overlay + merge-email-locales.sh. Resolved relative to THIS module, which holds in
    // both the ts-node (src/) and compiled (build/src/) layouts because both keep branding/ and
    // emails/ as siblings. Nothing else is written to disk: every served brand file (badge SVGs
    // included) is read from the archive by the webapp, so no path here can drift out of sync with
    // whatever serves it.
    if (archive) {
      const files = readArchive(archive.file)
      if (files) {
        overlayBrandRuntimeFiles(files, {
          emailsDir: path.join(import.meta.dirname, '..', 'emails'),
        })
      }
    }
  } catch (error) {
    // Never fatal — branding injection must not crash startup; fall back to framework defaults. Log
    // so a corrupt/unreadable archive (bad manifest, I/O error) is diagnosable in production.
    // eslint-disable-next-line no-console
    console.error(
      `[branding] failed to load active brand "${active}" — running on framework defaults:`,
      error,
    )
  }
}
