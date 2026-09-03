/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import config from 'eslint-config-it4c'
import graphql from 'eslint-config-it4c/modules/graphql'
import vitest from 'eslint-config-it4c/modules/vitest'

// The PolicyKey / EnvCategory enums are derived from their single sources and injected into the
// runtime schema by src/graphql/types/index.ts. graphql-eslint loads the STATIC .gql files, so
// it needs the same enums — else a .gql using `PolicyKey!` / `EnvCategory!` is an unknown type.
// Import the SDL from the SAME module the runtime uses, so the two schemas can't drift (that
// module is deliberately alias-free and dependency-light so this config's loader can import it).
import { derivedEnumSDLs } from './src/graphql/derivedEnums'

export default [
  {
    // public-docs/ is generated (spectaql, see the root `docs:api` script) and gitignored, so it only
    // exists on a machine that ran the generator — where its minified bundle made `npm run lint` fail
    // while CI, which never generates it, stayed green.
    //
    // schema.graphql is likewise generated (`npm run schema:print`), but it IS committed, so unlike
    // public-docs/ it fails lint everywhere rather than only locally. Its content is whatever
    // neo4j-graphql-js augments the schema into — unreachable filter/ordering types for every
    // type it touches, block descriptions in its own style. None of that is ours to fix, and
    // graphql-eslint should judge the hand-written .gql sources instead.
    ignores: ['node_modules/', 'build/', 'coverage/', 'public-docs/', 'schema.graphql'],
  },
  ...config,
  ...vitest,
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
          allowDefaultProject: ['eslint.config.ts', 'prettier.config.ts'],
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
    // Test file overrides
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',

      /* The vitest module of the shared config is considerably more opinionated than the jest
         module this suite grew up under — enabling it as-is reports ~1300 findings that have
         nothing to do with which runner executes the tests. They are switched off HERE, in the
         runner migration, so that this change stays behaviour-preserving; adopting them is a
         separate decision with its own review.

         `require-mock-type-parameters` is off for a second, stronger reason: its autofix replaces
         PRECISE mock signatures with `(...args: unknown[]) => unknown` and rewrites
         `vi.mock('x')` into `vi.mock(import('x'))`, which type-checks partial factories against
         the full module and therefore cannot hold. Applied once, it produced 1058 type errors. */
      /* These four REWRITE ASSERTIONS, and their autofix is not semantics-preserving. Applied
         once, they turned `toHaveBeenCalled()` into `toHaveBeenCalledWith()` (which asserts the
         call took NO arguments), `toBeTruthy()` into `toBe(true)` and `toBeFalsy()` into
         `toBe(false)` (wrong for every truthy value that is not the boolean), and `toEqual` into
         `toBe` (reference instead of structural equality). That silently changed what 79
         assertions across 25 spec files claimed, and CI caught it only because some of them
         started failing. Off for good — a matcher is an assertion, not formatting. */
      // Same category: its autofix renamed 143 test titles across 49 spec files, which changes
      // snapshot keys and anything that filters by test name.
      'vitest/prefer-lowercase-title': 'off',
      'vitest/prefer-called-with': 'off',
      'vitest/prefer-to-be': 'off',
      'vitest/prefer-strict-boolean-matchers': 'off',
      'vitest/prefer-expect-resolves': 'off',
      'vitest/prefer-expect-type-of': 'off',

      'vitest/require-mock-type-parameters': 'off',
      // The other half of that autofix: it rewrites `vi.mock('x')` into `vi.mock(import('x'))`.
      'vitest/prefer-import-in-mock': 'off',
      // Turns deliberate casts (where a stub is typed to the subset actually used) back into
      // vi.mocked(), which re-imposes the real signature the stub is not meant to satisfy.
      'vitest/prefer-vi-mocked': 'off',
      'vitest/max-expects': 'off',
      'vitest/require-hook': 'off',
      // Pre-existing shapes in this suite, none of them introduced by the runner switch.
      'vitest/require-to-throw-message': 'off',
      'vitest/prefer-hooks-on-top': 'off',
      'vitest/no-duplicate-hooks': 'off',
      'vitest/no-conditional-tests': 'off',
      'vitest/no-conditional-in-test': 'off',
      'vitest/prefer-strict-equal': 'off',
      'vitest/consistent-test-it': 'off',
      'vitest/require-top-level-describe': 'off',
      'vitest/max-nested-describe': 'off',
      'vitest/prefer-hooks-in-order': 'off',
    },
  },
  {
    // Shared test helpers (test/setup.ts, test/helpers.ts) legitimately import devDependencies
    // such as vitest. `n/no-unpublished-import` recognises `*.spec.ts` as unpublished on
    // its own, but not these — hence the narrow exemption. Deliberately its own block: folding it
    // into the spec overrides above would also hand `test/` the unbound-method exception, which
    // it does not need (verified: lint is clean without it).
    files: ['test/**/*.ts'],
    rules: {
      'n/no-unpublished-import': 'off',
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
