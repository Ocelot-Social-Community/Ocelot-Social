/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import config from 'eslint-config-it4c'
import graphql from 'eslint-config-it4c/modules/graphql'
import jest from 'eslint-config-it4c/modules/jest'

// The PolicyKey / EnvCategory enums are derived from their single sources and injected into the
// runtime schema by src/graphql/types/index.ts. graphql-eslint loads the STATIC .gql files, so
// it needs the same enums — else a .gql using `PolicyKey!` / `EnvCategory!` is an unknown type.
// Import the SDL from the SAME module the runtime uses, so the two schemas can't drift (that
// module is deliberately alias-free and dependency-light so this config's loader can import it).
import { derivedEnumSDLs } from './src/graphql/derivedEnums'

export default [
  {
    // public-docs/ is generated (spectaql, see the root `docs:api` script) and gitignored, so it only
    // exists on a machine that ran the generator — where its minified bundle made `yarn lint` fail
    // while CI, which never generates it, stayed green.
    //
    // schema.graphql is likewise generated (`yarn schema:print`), but it IS committed, so unlike
    // public-docs/ it fails lint everywhere rather than only locally. Its content is whatever
    // neo4j-graphql-js augments the schema into — unreachable filter/ordering types for every
    // type it touches, block descriptions in its own style. None of that is ours to fix, and
    // graphql-eslint should judge the hand-written .gql sources instead.
    ignores: ['node_modules/', 'build/', 'coverage/', 'public-docs/', 'schema.graphql'],
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
          schema: ['./src/graphql/types/**/*.gql', ...derivedEnumSDLs],
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
      // `@ocelot-social/branding` is `"type": "module"` with no `exports` map, so deep imports
      // resolve straight to files and ESM requires the `.js` suffix — dropping it breaks at
      // runtime. Only the `js` key is relaxed, and only to `ignorePackages`: our own relative
      // imports resolve to `.ts` and stay under the inherited `never`. The real fix is an
      // `exports` map on packages/branding, which would let this import be extensionless.
      'import-x/extensions': ['error', 'never', { json: 'always', js: 'ignorePackages' }],
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
  {
    // NAMING LOCK: test files are `*.spec.*` across the whole repo. Both suffixes used to be picked
    // up (and jest's testMatch still accepts either — DELIBERATELY, so a mis-named file fails loudly
    // here instead of being silently skipped), which is how the webapp's auth store once carried TWO
    // half-overlapping suites — an auth.test.js beside auth.spec.js, since merged into the latter.
    // Wrong suffix = lint error now.
    files: ['**/*.test.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'Rename this file to *.spec.* — test files use the .spec suffix in this repo.',
        },
      ],
    },
  },
]
