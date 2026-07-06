import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'

// Import allKeys() from the pure schema module, NOT the @src/policy barrel: the
// barrel re-exports PolicyService, which pulls in neo4j/redis/config (with its
// required-env assertions). typeDefs only needs the key list, so this keeps the
// type system — and thus `schema:print` — free of runtime config/env.
import { allKeys } from '@src/policy/schema'

// The category vocabulary lives in config/categories as a dependency-free leaf, so
// importing it here keeps typeDefs — and `schema:print` — free of runtime config/env.
import { ENV_CATEGORIES } from '@src/config/categories'

import type { DocumentNode } from 'graphql'

// eslint-disable-next-line n/no-sync
const typeDefs = loadFilesSync<DocumentNode>(path.join(__dirname, './**/*.gql'))

// The PolicyKey enum is DERIVED from policy.schema.json (via allKeys()) rather
// than hand-written in SDL — so the schema JSON stays the single source of truth
// for the key list, and Policy.gql can use `PolicyKey!` for a typed, validated,
// introspectable contract without duplicating the keys.
const policyKeyEnum = `enum PolicyKey { ${allKeys().join(' ')} }`

// EnvCategory is DERIVED from config/categories (same single-source pattern as
// PolicyKey above), so SystemConfig.gql can type `category` as a validated,
// introspectable enum without duplicating the vocabulary in SDL.
const envCategoryEnum = `enum EnvCategory { ${ENV_CATEGORIES.join(' ')} }`

export default mergeTypeDefs([...typeDefs, policyKeyEnum, envCategoryEnum])
