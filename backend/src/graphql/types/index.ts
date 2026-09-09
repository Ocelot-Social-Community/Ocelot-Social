import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'

// PolicyKey and EnvCategory are DERIVED from their single sources (policy.schema.json /
// config/categories) rather than hand-written in SDL — so .gql files can use `PolicyKey!` /
// `EnvCategory!` as typed, validated, introspectable contracts without duplicating the
// vocabularies. Their SDL is built in ../derivedEnums, which is shared with eslint.config.ts's
// static schema, so the runtime and lint schemas cannot drift (and stay free of the ajv/@src
// dependencies the ESLint config loader can't resolve).
import { derivedEnumSDLs } from '@src/graphql/derivedEnums'

import type { DocumentNode } from 'graphql'

// eslint-disable-next-line n/no-sync
const typeDefs = loadFilesSync<DocumentNode>(path.join(import.meta.dirname, './**/*.gql'))

export default mergeTypeDefs([...typeDefs, ...derivedEnumSDLs])
