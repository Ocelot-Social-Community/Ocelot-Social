// Schema-shape LOCK generator. Computes a structural fingerprint of the branding schema that matters
// for archive COMPATIBILITY — every config leaf path + its value type, plus the bucket→paths partition
// — and (when run directly) writes it to test/schema-shape.snapshot.json. The matching test asserts the
// live shape equals the committed snapshot, so a shape change cannot ship unnoticed: it forces a
// deliberate `npm run schema:snapshot` update, which is meant to accompany a feat/fix commit so
// release-please bumps SCHEMA_VERSION.
//
// Deliberately EXCLUDES default VALUES — a value change (e.g. group.nameLengthMax 50→60) is not a shape
// change and does not affect compat; only add/remove/rename/retype of a field, or a bucket reassignment.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { BUCKET_PATHS } from '../dist/buckets.js'
import { brandingDefaults } from '../dist/defaults.js'

export interface SchemaShape {
  leaves: string[]
  buckets: Record<string, string[]>
}

export function computeSchemaShape(): SchemaShape {
  const leaves: string[] = []
  const walk = (value: unknown, prefix: string): void => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value)
      if (keys.length) {
        for (const k of keys) {
          walk((value as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k)
        }
        return
      }
    }
    if (prefix) {
      const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
      leaves.push(`${prefix}: ${type}`)
    }
  }
  walk(brandingDefaults, '')
  leaves.sort()
  return { leaves, buckets: BUCKET_PATHS }
}

/** Write the schema-shape snapshot JSON (defaults to the committed test fixture). The CLI runner lives
 *  in schema-snapshot.run.ts. */
export function writeSnapshot(outPath?: string): string {
  const out =
    outPath ?? fileURLToPath(new URL('../test/schema-shape.snapshot.json', import.meta.url))
  writeFileSync(out, `${JSON.stringify(computeSchemaShape(), null, 2)}\n`)
  return out
}
