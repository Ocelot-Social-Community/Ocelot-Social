import assert from 'node:assert/strict'
import test from 'node:test'

import { flattenRule, resolveFilterGate } from './workflow-gate.mjs'

// A workflow of the shape resolveFilterGate is meant to follow, as a plain object — the parsed form
// is what it takes, so nothing here depends on a YAML parser. Each test mutates one link of the
// chain and asserts the resolution fails there rather than quietly succeeding somewhere else.
const workflow = () => ({
  jobs: {
    'files-changed': {
      outputs: { 'release-please': '${{ steps.changes.outputs.release-please }}' },
      steps: [{ name: 'Checkout', uses: 'actions/checkout@v7.0.1' }, { name: 'Check for file changes', uses: 'dorny/paths-filter@abc123 # v4.0.3', id: 'changes', with: { filters: '.github/file-filters.yml' } }],
    },
    lint: {
      needs: 'files-changed',
      if: "needs.files-changed.outputs.release-please == 'true'",
      steps: [{ run: 'node .github/release-please/lint.mjs' }],
    },
  },
})

test('resolves the filter file and rule a job is gated on', () => {
  assert.deepEqual(resolveFilterGate(workflow(), 'lint'), {
    status: 'gated',
    filtersFile: '.github/file-filters.yml',
    filterKey: 'release-please',
  })
})

test('a job with no `if:` is ungated, which needs no verification', () => {
  const doc = workflow()
  delete doc.jobs.lint.if
  assert.deepEqual(resolveFilterGate(doc, 'lint'), { status: 'ungated' })
})

test('`needs:` written as a list resolves the same', () => {
  const doc = workflow()
  doc.jobs.lint.needs = ['files-changed']
  assert.equal(resolveFilterGate(doc, 'lint').status, 'gated')
})

// Everything below is a wiring mistake that leaves the job permanently skipped — and a skipped job
// reports SUCCESS as a required check, so none of these is visible without this resolution failing.
const broken = [
  ['an unknown job id', (doc) => doc, 'nope', /has no job `nope`/],
  ['a condition referencing no job output', (doc) => (doc.jobs.lint.if = "github.ref == 'refs/heads/master'"), 'lint', /references no `needs\./],
  ['a condition referencing a job that does not exist', (doc) => (doc.jobs.lint.if = "needs.ghost.outputs.x == 'true'"), 'lint', /`ghost` is not a job/],
  ['a dependency read but not declared', (doc) => delete doc.jobs.lint.needs, 'lint', /does not list it in `needs:`/],
  ['an output the gate job does not declare', (doc) => delete doc.jobs['files-changed'].outputs['release-please'], 'lint', /declares no output `release-please`/],
  ['an output not wired to a step', (doc) => (doc.jobs['files-changed'].outputs['release-please'] = 'true'), 'lint', /references no `steps\./],
  ['a step id that is not in the gate job', (doc) => (doc.jobs['files-changed'].steps[1].id = 'elsewhere'), 'lint', /no step with `id: changes`/],
  ['a gate step that is not paths-filter', (doc) => (doc.jobs['files-changed'].steps[1].uses = 'actions/github-script@v7'), 'lint', /not dorny\/paths-filter@/],
  ['a non-default predicate quantifier', (doc) => (doc.jobs['files-changed'].steps[1].with['predicate-quantifier'] = 'every'), 'lint', /predicate-quantifier: every/],
  ['no filters input at all', (doc) => delete doc.jobs['files-changed'].steps[1].with.filters, 'lint', /passes no `filters:`/],
  ['filters given inline', (doc) => (doc.jobs['files-changed'].steps[1].with.filters = 'release-please:\n  - "**"'), 'lint', /inline/],
]

for (const [description, break_, jobId, expected] of broken) {
  test(`reports an error for ${description}`, () => {
    const doc = workflow()
    break_(doc)
    const gate = resolveFilterGate(doc, jobId)
    assert.equal(gate.status, 'error')
    assert.match(gate.reason, expected)
  })
}

// dorny/paths-filter's own rule shapes. The nesting is not a quirk of this repository's filter
// file: an alias used as a sequence item can only produce a nested array, and that is the action's
// single mechanism for sharing a list between rules.
test('flattens the nested arrays a YAML anchor produces', () => {
  assert.deepEqual(flattenRule(['a/**', [['b/**'], 'c/**'], 'd/**']), {
    patterns: ['a/**', 'b/**', 'c/**', 'd/**'],
    unsupported: [],
  })
})

test('reports the status-qualified item form as unsupported rather than reading through it', () => {
  const { patterns, unsupported } = flattenRule(['a/**', { 'added|modified': 'b/**' }])
  assert.deepEqual(patterns, ['a/**'])
  assert.deepEqual(unsupported, [{ 'added|modified': 'b/**' }])
})

test('a single pattern written as a bare string is a one-pattern rule', () => {
  assert.deepEqual(flattenRule('a/**'), { patterns: ['a/**'], unsupported: [] })
})

// There is no test here resolving the CHECKED-IN workflow against the real filter file, on purpose:
// these tests run before the lint's dependencies are installed and so have no YAML parser, and a
// test that quietly returns when its import fails is worse than none. `lint.mjs` performs exactly
// that resolution against exactly those files on every run — it is the end-to-end case.
