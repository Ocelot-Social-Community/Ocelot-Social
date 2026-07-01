/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import config from 'eslint-config-it4c'
import graphql from 'eslint-config-it4c/modules/graphql'
import jest from 'eslint-config-it4c/modules/jest'

import policySchema from './src/policy/policy.schema.json'

// PolicyKey enum is derived from policy.schema.json (the single source of truth),
// the same way src/graphql/types/index.ts injects it into the runtime schema.
// graphql-eslint loads the static .gql files, so it needs the enum supplied here
// too — otherwise Policy.gql's `key: PolicyKey!` would be an unknown type.
const policyKeyEnumSDL = `enum PolicyKey { ${Object.keys(policySchema.properties).join(' ')} }`

export default [
  {
    ignores: ['node_modules/', 'build/', 'coverage/'],
  },
  ...config,
  ...jest,
  // GraphQL schema linting (extend file pattern to include .gql)
  ...graphql.map((c) => ({
    ...c,
    files: ['**/*.graphql', '**/*.gql'],
  })),
  {
    files: ['**/*.graphql', '**/*.gql'],
    // TODO: Parser must be set explicitly because the it4c module only provides
    // plugins and rules, not languageOptions. Without this, ESLint uses the JS
    // parser for .gql files. Remove when fixed in eslint-config-it4c.
    languageOptions: {
      parser: graphql[0].plugins['@graphql-eslint'].parser,
      parserOptions: {
        graphQLConfig: {
          schema: ['./src/graphql/types/**/*.gql', policyKeyEnumSDL],
          documents: './src/graphql/queries/**/*.gql',
        },
      },
    },
    rules: {
      // Documentation gate for the API reference (SpectaQL). Scoped to the surface
      // we hand-author and that is worth documenting:
      //   - rootField: every Query/Mutation/Subscription field (each API operation)
      //   - Union/Scalar/Interface type definitions
      // Deliberately NOT enforced: ObjectTypeDefinition/EnumTypeDefinition/
      // InputObjectTypeDefinition. Object types would flag every re-opened
      // `type Query/Mutation/Subscription` block (the schema is split across files),
      // and enums/inputs carry the neo4j-graphql-js `_*Filter`/`_*Ordering` helpers
      // that are generated noise. Those domain types are still documented by
      // convention; only the low-signal/unsatisfiable kinds are left unchecked.
      '@graphql-eslint/require-description': [
        'error',
        {
          rootField: true,
          UnionTypeDefinition: true,
          ScalarTypeDefinition: true,
          InterfaceTypeDefinition: true,
        },
      ],
      // camelCase operation names and _id/_ne underscores conflict with existing schema
      '@graphql-eslint/naming-convention': 'off',
      // Many types (Image, File, InviteCode, etc.) intentionally lack id: ID!
      '@graphql-eslint/strict-id-in-types': 'off',
      // Fields like groupType, queryLocations match parent type name by coincidence
      '@graphql-eslint/no-typename-prefix': 'off',
      // neo4j-graphql-js adds arguments (first, offset) at runtime not present in static schema
      '@graphql-eslint/known-argument-names': 'off',
      // TODO: operations-recommended rules must be disabled because the it4c
      // graphql module bundles both schema and operations configs together.
      // Remove when eslint-config-it4c exports them separately (e.g. graphql/schema).
      '@graphql-eslint/executable-definitions': 'off',
      // neo4j-graphql-js adds fields at runtime (_id, relations) not present in static schema
      '@graphql-eslint/fields-on-correct-type': 'off',
    },
  },
  {
    // Backend-specific TypeScript overrides
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.ts', 'jest.config.ts', 'prettier.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeORM compatibility: joined tables can be null but are not defined as nullable
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Allow string.match(regex) instead of regex.exec(string)
      '@typescript-eslint/prefer-regexp-exec': 'off',
      // TODO: gradually add return types to exported functions, then remove this override
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow @/* path aliases in relative parent imports
      'import-x/no-relative-parent-imports': ['error', { ignore: ['@/*'] }],
    },
  },
  {
    // Jest test file overrides
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Config files: allow require() of devDependencies
    files: ['*.config.{js,mjs,cjs,ts,mts,cts}'],
    rules: {
      'n/no-unpublished-require': 'off',
    },
  },
]
