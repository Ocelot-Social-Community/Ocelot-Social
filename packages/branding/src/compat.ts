// Schema-version compatibility between a brand archive and the branding runtime.
//
// An archive records the @ocelot-social/branding version it was BUILT with (manifest.schemaVersion);
// this compares it against the version RUNNING now (SCHEMA_VERSION — both derive from the SAME source,
// the package's package.json). A mismatch means the archive and the runtime disagree on the config
// SHAPE. Breaking schema changes bump the compatibility axis:
//   • once the schema is >= 1.0.0 → the MAJOR version is the axis (SemVer proper).
//   • while it is 0.x            → the MINOR version is the axis (SemVer caret: every 0.MINOR bump may
//                                  break; a 0.0.z patch is treated as non-breaking).
// This is a pure, node-free module — safe to import from the package index (client bundle included).
import { SCHEMA_VERSION } from './version.js'

export type SchemaCompat = 'ok' | 'archive-newer' | 'archive-older' | 'unknown'

// Map a version to its monotonic "breaking generation" key, or null when unparseable. Encoded so a
// >= 1.0 archive always sorts ABOVE any 0.x runtime (a 1.0 archive is newer than every 0.x).
function generation(version: string | null | undefined): number | null {
  if (!version) {
    return null
  }
  const parts = version.split('.')
  const major = Number.parseInt(parts[0] ?? '', 10)
  if (Number.isNaN(major)) {
    return null
  }
  const minor = Number.parseInt(parts[1] ?? '0', 10) || 0
  return major > 0 ? 1_000_000 + major : minor
}

/**
 * Compare the schema version an archive was BUILT with against the branding package RUNNING now
 * (defaults to this package's own SCHEMA_VERSION). Returns:
 *   • `ok`             — same breaking generation, safe to use.
 *   • `archive-newer`  — archive built with a newer schema; it may reference config this runtime does
 *                        not understand → the STRICT case (warn hard / consider refusing).
 *   • `archive-older`  — archive built with an older schema; new fields fall back to defaults (compose
 *                        already does this) → soft warning.
 *   • `unknown`        — either version is missing/unparseable (e.g. a pre-schemaVersion archive).
 */
export function checkSchemaCompat(
  archiveVersion: string | null | undefined,
  runtimeVersion: string | null | undefined = SCHEMA_VERSION,
): SchemaCompat {
  const a = generation(archiveVersion)
  const r = generation(runtimeVersion)
  if (a === null || r === null) {
    return 'unknown'
  }
  if (a === r) {
    return 'ok'
  }
  return a > r ? 'archive-newer' : 'archive-older'
}

/** A human warning for a non-ok verdict, or null when compatible/unknown (nothing actionable to say). */
export function describeSchemaCompat(
  verdict: SchemaCompat,
  archiveVersion: string | null | undefined,
  runtimeVersion: string | null | undefined = SCHEMA_VERSION,
): string | null {
  const archive = archiveVersion ?? '?'
  const runtime = runtimeVersion ?? '?'
  switch (verdict) {
    case 'archive-newer':
      return `brand archive was built with a NEWER branding schema (${archive}) than this runtime (${runtime}); it may reference config this runtime does not understand — rebuild/redeploy the app.`
    case 'archive-older':
      return `brand archive was built with an OLDER branding schema (${archive}) than this runtime (${runtime}); new fields fall back to defaults — rebuild the archive to pick them up.`
    case 'ok':
    case 'unknown':
      return null
  }
}
