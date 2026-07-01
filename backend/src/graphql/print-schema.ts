/* eslint-disable @typescript-eslint/no-unsafe-call */
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { lexicographicSortSchema, print, printSchema } from 'graphql'
import { makeAugmentedSchema } from 'neo4j-graphql-js'

import typeDefs from '@graphql/types/index'

import { augmentedSchemaConfig } from './schema.augment-config'

import type { GraphQLSchema } from 'graphql'

// Print the fully *augmented* runtime schema (neo4j-graphql-js adds auto-generated
// queries, filters, orderBy and CRUD mutations on top of the hand-written SDL) to
// an SDL file. This file is the source of truth consumed by the API docs generator
// (SpectaQL). It is a git-ignored build artifact (see backend/.gitignore),
// regenerated on every `docs:api` / `docs:dev` run — it is not committed.
//
// The schema is built from typeDefs + the shared augmentation config ONLY (no
// resolvers), so printing does not import runtime config and its required-env
// assertions — the SDL is defined by the type system, not by execution. This also
// means `schema:print` needs no env and no .gql require-hook.
//
// Sorting lexicographically keeps the output deterministic across runs regardless
// of file load order, so regenerating without API changes yields an identical file.
const outFile = path.resolve(__dirname, '../../schema.graphql')

// neo4j-graphql-js ships no types, so makeAugmentedSchema() is `any`; assert the
// GraphQLSchema it actually returns so the rest is type-checked (this cast is the
// type boundary, not redundant — removing it fails no-unsafe-argument).
const schema = makeAugmentedSchema({
  typeDefs: print(typeDefs),
  config: augmentedSchemaConfig,
}) as GraphQLSchema

const sdl = printSchema(lexicographicSortSchema(schema))

// eslint-disable-next-line n/no-sync
writeFileSync(outFile, sdl + '\n', 'utf-8')

// eslint-disable-next-line no-console
console.log(`Wrote augmented schema SDL to ${outFile}`)
