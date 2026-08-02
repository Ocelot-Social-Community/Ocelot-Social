// SCHEMA SHAPE LOCK. The compat axis (SCHEMA_VERSION) must move when the schema SHAPE changes; this
// test makes a shape change impossible to ship UNNOTICED. It fails when the live shape (config leaf
// paths + types + bucket partition) diverges from the committed snapshot — forcing a deliberate update
// that is meant to accompany a feat(package/branding)/fix(package/branding) PR (→ release-please
// bumps the version).
//
// What it deliberately does NOT do — and cannot — is verify that the bump HAPPENED:
//   • SCHEMA_VERSION is not hand-maintained. src/version.ts carries the `x-release-please-version`
//     marker and is listed under `extra-files` in release-please-config.json, so the bump lands in a
//     SEPARATE release PR after this one is merged. In a schema PR the version is unchanged by
//     construction; asserting otherwise would fail every legitimate schema change.
//   • The test has no git history either. It can answer "shape == snapshot?", not "did the shape
//     CHANGE?" — the snapshot is regenerated in the same commit, so the two always agree by the time
//     this runs. Whether a change is COMPAT-relevant lives in the diff, not in the process.
// Coupling the version to the shape therefore belongs in CI (snapshot file in the diff → require a
// feat/fix PR title), not here. Only the lock itself is enforceable at this level.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { computeSchemaShape, writeSnapshot } from '../scripts/schema-snapshot.ts'

test('SCHEMA SHAPE LOCK: config shape matches the committed snapshot', () => {
  const committed = JSON.parse(
    readFileSync(new URL('./schema-shape.snapshot.json', import.meta.url), 'utf8'),
  )
  assert.deepEqual(
    computeSchemaShape(),
    committed,
    'The branding schema SHAPE changed (a config field was added/removed/renamed/retyped, or a bucket ' +
      'was reassigned) — a COMPAT-relevant change. Do BOTH: (1) title the PR feat(package/branding) or ' +
      'fix(package/branding) so release-please bumps SCHEMA_VERSION in its next release PR, and ' +
      '(2) run `npm run schema:snapshot` to update this lock.',
  )
})

test('writeSnapshot serialises the current shape to the given file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ocelot-snap-'))
  try {
    const out = writeSnapshot(join(dir, 'snap.json'))
    assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), computeSchemaShape())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
