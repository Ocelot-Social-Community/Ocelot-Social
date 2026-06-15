import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { lexicographicSortSchema, printSchema } from 'graphql'

import schema from './schema'

// Print the fully *augmented* runtime schema (neo4j-graphql-js adds auto-generated
// queries, filters, orderBy and CRUD mutations on top of the hand-written SDL) to
// an SDL file. This file is the single source of truth consumed by the API docs
// generator (SpectaQL) and is committed so schema changes show up as diffs in PRs.
//
// Sorting lexicographically keeps the output stable across runs regardless of file
// load order, so the committed schema only changes when the API actually changes.
const outFile = path.resolve(__dirname, '../../schema.graphql')

const sdl = printSchema(lexicographicSortSchema(schema as Parameters<typeof printSchema>[0]))

// eslint-disable-next-line n/no-sync
writeFileSync(outFile, sdl + '\n', 'utf-8')

// eslint-disable-next-line no-console
console.log(`Wrote augmented schema SDL to ${outFile}`)
