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
export const schemaSdlFile = path.resolve(import.meta.dirname, '../../schema.graphql')

// Only write when invoked as a script (`npm run schema:print`). Importing this module —
// which the snapshot test does — must not touch the file it is about to verify.
// ESM has no `require.main`/`module`; `import.meta.main` is the direct replacement (Node 24+,
// well under the engines floor of 25.5). The obvious hand-rolled equivalent —
// `import.meta.url === pathToFileURL(process.argv[1]).href` — throws ERR_INVALID_ARG_TYPE
// during module evaluation whenever argv[1] is unset, which is the case for `node --eval` and
// the REPL: merely IMPORTING this module would then fail.
//
// Not covered, and not coverable from a spec: `import.meta.main` is false for every import, which
// is the whole point of the guard — a test that made it true would be writing the very file
// schema.snapshot.spec.ts verifies. Both statements it guards are the script's I/O; the part with
// behaviour, buildSchemaSdl(), is what that snapshot test exercises.
/* v8 ignore start -- script entry point: true only when run as `npm run schema:print` */
if (import.meta.main) {
  // eslint-disable-next-line n/no-sync
  writeFileSync(schemaSdlFile, buildSchemaSdl(), 'utf-8')

  // eslint-disable-next-line no-console
  console.log(`Wrote schema SDL to ${schemaSdlFile}`)
}
/* v8 ignore stop */
