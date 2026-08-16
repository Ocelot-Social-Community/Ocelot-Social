import { readFileSync } from 'node:fs'

import { buildAugmentedSdl, schemaSdlFile } from './print-schema'

// Guards the PUBLIC API surface. `schema.graphql` is committed, so every change to it
// shows up as a reviewable diff; this test fails when the generated SDL and the committed
// file drift apart.
//
// Why this matters beyond ordinary review hygiene: neo4j-graphql-js generates a large part
// of the schema (queries, filters, orderBy) from directives in the .gql files. While that
// library is being replaced step by step, an edit meant to be internal can change the SDL
// as a side effect. Without this test the first symptom would be a broken frontend query.
//
// What it does NOT catch: removing a @cypher/@relation directive leaves the printed SDL
// unchanged (graphql-js prints directive *definitions*, not their *application* to fields).
// That is exactly the edit the migration makes, so the SDL snapshot is the guard against
// collateral damage, not against the migration's own failure mode — field resolution is
// covered separately by the field-selection tests.
//
// The SDL is derived from typeDefs + the augmentation config only, so this needs no env,
// no database and no .gql require-hook.
describe('schema.graphql snapshot', () => {
  // Line-set comparison rather than toEqual() on the whole string: a 4000-line diff is
  // unreadable in the reporter, and it reports every following line as changed when a
  // single line is inserted. Set semantics survive that shift and name the actual delta.
  // Safe here because printSchema() output is lexicographically sorted, so a pure
  // reordering cannot occur.
  const linesOnlyIn = (a: string[], b: string[]): string[] => {
    const other = new Set(b)
    return a.filter((line) => line.trim() !== '' && !other.has(line))
  }

  it('matches the generated SDL — run `yarn schema:print` and commit if this fails', () => {
    // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename
    const committed = readFileSync(schemaSdlFile, 'utf-8').split('\n')
    const generated = buildAugmentedSdl().split('\n')

    expect({
      addedToSchema: linesOnlyIn(generated, committed),
      removedFromSchema: linesOnlyIn(committed, generated),
    }).toEqual({ addedToSchema: [], removedFromSchema: [] })

    // Catches the residue a line-set comparison cannot see (duplicate-line counts,
    // trailing whitespace), so the committed file is byte-identical to the generator.
    expect(committed).toEqual(generated)
  })
})
