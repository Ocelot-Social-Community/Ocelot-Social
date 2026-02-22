import comments from 'eslint-config-it4c/modules/comments'
import eslint from 'eslint-config-it4c/modules/eslint'
import importX from 'eslint-config-it4c/modules/import-x'
import jest from 'eslint-config-it4c/modules/jest'
import json from 'eslint-config-it4c/modules/json'
import node from 'eslint-config-it4c/modules/node'
import prettier from 'eslint-config-it4c/modules/prettier'
import promise from 'eslint-config-it4c/modules/promise'
import security from 'eslint-config-it4c/modules/security'
import typescript from 'eslint-config-it4c/modules/typescript'
import yaml from 'eslint-config-it4c/modules/yaml'

// TODO: GraphQL linting is disabled because @graphql-eslint/eslint-plugin v4
// (bundled with eslint-config-it4c) requires graphql@^16, but the backend
// uses graphql@^14 (required by apollo-server v2). Re-enable when upgrading graphql.
// import graphql from 'eslint-config-it4c/modules/graphql'
//
// ...graphql.map((c) => ({
//   ...c,
//   files: ['**/*.graphql', '**/*.gql'],
// })),
// {
//   files: ['**/*.graphql', '**/*.gql'],
//   languageOptions: {
//     parserOptions: {
//       schema: './src/graphql/types/**/*.gql',
//       assumeValid: true,
//     },
//   },
//   rules: {
//     '@graphql-eslint/require-description': 'off',
//     '@graphql-eslint/naming-convention': 'off',
//     '@graphql-eslint/strict-id-in-types': 'off',
//     '@graphql-eslint/no-typename-prefix': 'off',
//     '@graphql-eslint/known-directives': 'off',
//     '@graphql-eslint/known-argument-names': 'off',
//     '@graphql-eslint/known-type-names': 'off',
//     '@graphql-eslint/lone-schema-definition': 'off',
//     '@graphql-eslint/provided-required-arguments': 'off',
//     '@graphql-eslint/unique-directive-names': 'off',
//     '@graphql-eslint/unique-directive-names-per-location': 'off',
//     '@graphql-eslint/unique-field-definition-names': 'off',
//     '@graphql-eslint/unique-operation-types': 'off',
//     '@graphql-eslint/unique-type-names': 'off',
//   },
// },

export default [
  {
    ignores: ['node_modules/', 'build/', 'coverage/'],
  },
  ...eslint,
  ...typescript,
  ...importX,
  ...node,
  ...promise,
  ...security,
  ...comments,
  ...json,
  ...yaml,
  ...prettier,
  ...jest,
  {
    // Backend-specific TypeScript overrides
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
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
