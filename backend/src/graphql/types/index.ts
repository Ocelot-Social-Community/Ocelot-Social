import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'

import { allKeys } from '@src/policy'

import type { DocumentNode } from 'graphql'

// eslint-disable-next-line n/no-sync
const typeDefs = loadFilesSync<DocumentNode>(path.join(__dirname, './**/*.gql'))

// The PolicyKey enum is DERIVED from policy.schema.json (via allKeys()) rather
// than hand-written in SDL — so the schema JSON stays the single source of truth
// for the key list, and Policy.gql can use `PolicyKey!` for a typed, validated,
// introspectable contract without duplicating the keys.
const policyKeyEnum = `enum PolicyKey { ${allKeys().join(' ')} }`

export default mergeTypeDefs([...typeDefs, policyKeyEnum])
