import { readFileSync } from 'node:fs'

import { buildSchemaSdl, schemaSdlFile } from './print-schema'

// Guards the PUBLIC API surface. `schema.graphql` is committed, so every change to it
// shows up as a reviewable diff; this test fails when the generated SDL and the committed
// file drift apart.
//
// Why this matters beyond ordinary review hygiene: the SDL is the contract the webapp and
// any API-key client compile against, and it is easy to change one without meaning to. The
// committed file turns that into a reviewable diff instead of a runtime surprise.
//
// It was written during the neo4j-graphql-js migration, where the library generated a large
// part of the schema and an edit meant to be internal could shift the SDL underneath us.
// The library is gone, but the guard is just as useful now that the .gql files ARE the
// schema. Its companion is webappQueries.spec.ts, which checks the other direction: that
// what the client sends still fits what the schema offers.
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
    const generated = buildSchemaSdl().split('\n')

    expect({
      addedToSchema: linesOnlyIn(generated, committed),
      removedFromSchema: linesOnlyIn(committed, generated),
    }).toEqual({ addedToSchema: [], removedFromSchema: [] })

    // Catches the residue a line-set comparison cannot see (duplicate-line counts,
    // trailing whitespace), so the committed file is byte-identical to the generator.
    expect(committed).toEqual(generated)
  })
})
