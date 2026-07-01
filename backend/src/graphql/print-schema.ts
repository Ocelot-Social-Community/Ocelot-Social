import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { lexicographicSortSchema, printSchema } from 'graphql'

import schema from './schema'

// Print the fully *augmented* runtime schema (neo4j-graphql-js adds auto-generated
// queries, filters, orderBy and CRUD mutations on top of the hand-written SDL) to
// an SDL file. This file is the source of truth consumed by the API docs generator
// (SpectaQL). It is a git-ignored build artifact (see backend/.gitignore),
// regenerated on every `docs:api` / `docs:dev` run — it is not committed.
//
// Sorting lexicographically keeps the output deterministic across runs regardless
// of file load order, so regenerating without API changes yields an identical file.
const outFile = path.resolve(__dirname, '../../schema.graphql')

const sdl = printSchema(lexicographicSortSchema(schema as Parameters<typeof printSchema>[0]))

// eslint-disable-next-line n/no-sync
writeFileSync(outFile, sdl + '\n', 'utf-8')

// eslint-disable-next-line no-console
console.log(`Wrote augmented schema SDL to ${outFile}`)
