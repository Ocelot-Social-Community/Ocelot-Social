/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import config from 'eslint-config-it4c'
import graphql from 'eslint-config-it4c/modules/graphql'
import jest from 'eslint-config-it4c/modules/jest'

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
          schema: './src/graphql/types/**/*.gql',
          documents: './src/graphql/queries/**/*.gql',
        },
      },
    },
    rules: {
      // Would require descriptions on every type/field/input — too noisy for now
      '@graphql-eslint/require-description': 'off',
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
