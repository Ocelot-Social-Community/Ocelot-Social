import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { makeExecutableSchema } from '@graphql-tools/schema'
import { lexicographicSortSchema, printSchema } from 'graphql'

import typeDefs from '@graphql/types/index'

// The schema SDL. Two consumers:
//   1. the API docs generator (SpectaQL), via the `schema.graphql` file below
//   2. schema.snapshot.spec.ts, which diffs this against the committed file so any
//      unintended change to the public API surface fails a test instead of silently
//      reaching the frontend.
//
// Built from typeDefs alone — no resolvers — so it needs no env and no database. Since
// stage D of the neo4j-graphql-js migration the SDL is simply what the .gql files say;
// nothing is generated on top of it any more.
//
// Sorting lexicographically keeps the output deterministic across runs regardless of file
// load order, so regenerating without API changes yields an identical file.
export const buildSchemaSdl = (): string =>
  printSchema(lexicographicSortSchema(makeExecutableSchema({ typeDefs }))) + '\n'

// Committed to git (NOT a build artefact) so that `git diff` shows API changes in review
// and the snapshot test has something to compare against.
export const schemaSdlFile = path.resolve(__dirname, '../../schema.graphql')

// Only write when invoked as a script (`yarn schema:print`). Importing this module —
// which the snapshot test does — must not touch the file it is about to verify.
if (require.main === module) {
  // eslint-disable-next-line n/no-sync
  writeFileSync(schemaSdlFile, buildSchemaSdl(), 'utf-8')

  // eslint-disable-next-line no-console
  console.log(`Wrote schema SDL to ${schemaSdlFile}`)
}
