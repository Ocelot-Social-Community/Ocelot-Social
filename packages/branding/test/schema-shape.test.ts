// SCHEMA SHAPE LOCK. The compat axis (SCHEMA_VERSION) must move when the schema SHAPE changes; this
// test makes a shape change impossible to ship unnoticed. It fails when the live shape (config leaf
// paths + types + bucket partition) diverges from the committed snapshot — forcing a deliberate update
// that is meant to accompany a feat(branding)/fix(branding) commit (→ release-please bumps the version).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { computeSchemaShape } from '../scripts/schema-snapshot.ts'

test('SCHEMA SHAPE LOCK: config shape matches the committed snapshot', () => {
  const committed = JSON.parse(
    readFileSync(new URL('./schema-shape.snapshot.json', import.meta.url), 'utf8'),
  )
  assert.deepEqual(
    computeSchemaShape(),
    committed,
    'The branding schema SHAPE changed (a config field was added/removed/renamed/retyped, or a bucket ' +
      'was reassigned) — a COMPAT-relevant change. Do BOTH: (1) commit it as feat(branding)/fix(branding) ' +
      'so release-please bumps SCHEMA_VERSION, and (2) run `npm run schema:snapshot` to update this lock.',
  )
})
