// SCHEMA SHAPE LOCK. The compat axis (SCHEMA_VERSION) must move when the schema SHAPE changes; this
// test makes a shape change impossible to ship UNNOTICED. It fails when the live shape (config leaf
// paths + types + bucket partition) diverges from the committed snapshot — forcing a deliberate update
// that has to come with a version bump.
//
// HOW THE VERSION MOVES, as of 0.1.0: BY HAND, in the same PR. release-please owns the bump on paper
// (src/version.ts carries the `x-release-please-version` marker and is listed under `extra-files`), but
// its workflow does not run — the release-bot credentials are not configured — so nothing bumps on its
// own. Until that is set up, a schema change means editing THREE places together: package.json,
// src/version.ts (compat.spec.ts asserts they match) and .release-please-manifest.json (so the bot, once
// it runs, does not compute a version BELOW what archives already carry).
//
// And mind the axis: while the version is < 1.0, compat.ts reads the MINOR (see generation()). A patch
// bump does NOT separate generations — 0.0.1 and 0.0.2 both compare as `ok`. A breaking schema change
// needs a MINOR bump, and the brand archives must be rebuilt to carry it.
//
// What this test deliberately does NOT do — and cannot — is verify that the bump HAPPENED:
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

import { computeSchemaShape, writeSnapshot } from './schema-snapshot.ts'

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
