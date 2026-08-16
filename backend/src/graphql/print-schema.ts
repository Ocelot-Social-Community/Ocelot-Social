/* eslint-disable @typescript-eslint/no-unsafe-call */
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { lexicographicSortSchema, print, printSchema } from 'graphql'
import { makeAugmentedSchema } from 'neo4j-graphql-js'

import typeDefs from '@graphql/types/index'

import { augmentedSchemaConfig } from './schema.augment-config'

import type { GraphQLSchema } from 'graphql'

// The fully *augmented* schema SDL (neo4j-graphql-js adds auto-generated queries,
// filters, orderBy and CRUD mutations on top of the hand-written SDL). Two consumers:
//   1. the API docs generator (SpectaQL), via the `schema.graphql` file below
//   2. schema.snapshot.spec.ts, which diffs this against the committed file so any
//      unintended change to the public API surface fails a test instead of silently
//      reaching the frontend. That guard is what makes the neo4j-graphql-js migration
//      safe to do in small steps — see docs on the migration plan.
//
// The schema is built from typeDefs + the shared augmentation config ONLY (no
// resolvers), so building it does not import runtime config and its required-env
// assertions — the SDL is defined by the type system, not by execution. This also
// means `schema:print` (and the snapshot test) needs no env and no .gql require-hook.
//
// Sorting lexicographically keeps the output deterministic across runs regardless
// of file load order, so regenerating without API changes yields an identical file.
export const buildAugmentedSdl = (): string => {
  // neo4j-graphql-js ships no types, so makeAugmentedSchema() is `any`; assert the
  // GraphQLSchema it actually returns so the rest is type-checked (this cast is the
  // type boundary, not redundant — removing it fails no-unsafe-argument).
  const schema = makeAugmentedSchema({
    typeDefs: print(typeDefs),
    config: augmentedSchemaConfig,
  }) as GraphQLSchema

  return printSchema(lexicographicSortSchema(schema)) + '\n'
}

// Committed to git (NOT a build artifact anymore) so that `git diff` shows API changes
// in review and the snapshot test has something to compare against.
export const schemaSdlFile = path.resolve(__dirname, '../../schema.graphql')

// Only write when invoked as a script (`yarn schema:print`). Importing this module —
// which the snapshot test does — must not touch the file it is about to verify.
if (require.main === module) {
  // eslint-disable-next-line n/no-sync
  writeFileSync(schemaSdlFile, buildAugmentedSdl(), 'utf-8')

  // eslint-disable-next-line no-console
  console.log(`Wrote augmented schema SDL to ${schemaSdlFile}`)
}
