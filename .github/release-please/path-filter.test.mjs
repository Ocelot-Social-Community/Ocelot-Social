import assert from 'node:assert/strict'
import test from 'node:test'

import { triggers } from './path-filter.mjs'

// Node's built-in runner, no dependency: `node --test .github/release-please/`.
//
// The first case is the one that motivated writing a real matcher. A prefix comparison up to the
// first wildcard called it covered, which made the trigger check pass while GitHub would not have
// started a run — the failure direction a lint must never have.
const cases = [
  [['packages/*/package.json'], 'packages/ui/package-lock.json', false, '`*` does not run past the file name'],
  [['packages/*/package.json'], 'packages/ui/package.json', true, 'the same pattern does cover the package.json'],
  [['packages/*/package.json'], 'packages/a/b/package.json', false, '`*` does not match `/`'],
  [['packages/**/package.json'], 'packages/a/b/package.json', true, '`**` matches across `/`'],

  [['.github/release-please/**'], '.github/release-please/ui-config.json', true, 'directory glob'],
  [['.github/release-please/**'], '.github/workflows/publish.yml', false, 'a different directory'],
  [['deployment/helm/charts/*/Chart.yaml'], 'deployment/helm/charts/ocelot-neo4j/Chart.yaml', true, 'the charts, as they are written today'],

  [['package.json'], 'package.json', true, 'literal'],
  [['package.json'], 'package-lock.json', false, 'a literal does not match a longer name'],
  [['package.json'], 'backend/package.json', false, 'a literal is anchored at the repository root'],

  [['backend/**', '!backend/package-lock.json'], 'backend/package-lock.json', false, 'a negative pattern excludes again'],
  [['backend/**', '!backend/package-lock.json'], 'backend/package.json', true, 'and excludes only what it names'],
  [['backend/**', '!backend/**', 'backend/package.json'], 'backend/package.json', true, 'a later positive re-includes'],
  [['!backend/**', 'backend/**'], 'backend/package.json', true, 'order decides (positive last)'],
  [['backend/**', '!backend/**'], 'backend/package.json', false, 'order decides (negative last)'],

  [['ab?c.json'], 'ac.json', true, '`?` is a quantifier on the preceding character, not a wildcard'],
  [['ab?c.json'], 'abc.json', true, 'and the character may be present'],
  [['ab+c.json'], 'abbc.json', true, '`+` is a quantifier too'],
  [['ab+c.json'], 'ac.json', false, '`+` requires at least one'],
  [['v[12].json'], 'v2.json', true, 'character set'],
  [['v[12].json'], 'v3.json', false, 'character set excludes'],
  [['v[!12].json'], 'v3.json', true, 'a leading `!` negates the set'],

  [[], 'package.json', false, 'an empty list covers nothing'],
  [['!backend/**'], 'backend/package.json', false, 'negatives alone never include'],
]

for (const [patterns, target, expected, description] of cases) {
  test(`${JSON.stringify(patterns)} vs ${target} — ${description}`, () => {
    assert.equal(triggers(patterns, target), expected)
  })
}
