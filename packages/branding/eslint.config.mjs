// Flat ESLint config for @ocelot-social/branding — the shared it4c ruleset (same as backend), scoped
// to this pure package. The it4c default already composes eslint / typescript (type-checked via
// projectService) / import-x / node / promise / security / prettier and ignores dist/.
//
// A handful of it4c rules are relaxed below. Each relaxation is CONCEPTUAL, not a quota-dodge: this
// package is a *synchronous, trusted-input* build+bootstrap library (a tar codec + an archive-discovery
// layer). The relaxed rules assume server-request async I/O over untrusted paths — the opposite of what
// this package is — so leaving them on would only produce false positives. Everything genuinely wrong
// (types, unused code, dead conditions) stays an error via the type-checked TS rules.
import config from 'eslint-config-it4c'
import { configs as tsConfigs, plugin as tsPlugin } from 'typescript-eslint'

export default [
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'example/'] },
  ...config,
  {
    rules: {
      // Dynamic-by-key config transformation IS this package's job: getPath/setPath/composeConfig index
      // objects with computed keys drawn from a FIXED schema / BUCKET_NAMES, never from user input.
      'security/detect-object-injection': 'off',
      // Every fs path here is trusted: brand directories passed on the CLI and archive paths DISCOVERED
      // under a served root — never request/user input. The heuristic only sees "non-literal argument".
      'security/detect-non-literal-fs-filename': 'off',
      // The package is synchronous BY DESIGN: a gzip/tar codec and an archive-discovery layer read
      // during SSR bootstrap and build scripts. Going async would infect the whole render/boot path for
      // no benefit (reads are tiny and mtime-cached).
      'n/no-sync': 'off',
      // IO-resilience contract: a missing / half-written / garbled archive must degrade to `null` (the
      // slot falls back to the framework default), never throw and 500 the site mid-deploy. The catches
      // deliberately treat ANY failure as "archive absent".
      'no-catch-all/no-catch-all': 'off',
      // The only callbacks here are a synchronous leaf-visitor and fs.watch — no promises involved, so
      // "prefer async/await" does not apply.
      'promise/prefer-await-to-callbacks': 'off',
      // The package is ESM ("type": "module"), so relative imports MUST carry the explicit `.js`
      // extension — this rule (which forbids extensions) is the wrong default for an ESM package.
      'n/file-extension-in-import': 'off',
    },
  },
  {
    // Hoisted function declarations may be referenced above their definition (discover.ts orders its
    // public API before private helpers on purpose). Variables/classes are still guarded. Scoped to a
    // block that registers the tseslint plugin (flat-config requires the plugin in the same object).
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    },
  },
  {
    // Build scripts (.ts, run via Node type-stripping) import the COMPILED `../dist` by explicit path —
    // mandatory for ESM Node, no in-package alias to route through. They are CLIs (stdout is output) and
    // log tiny numbers (file counts / byte sizes) in template literals.
    files: ['scripts/**/*.ts'],
    rules: {
      'import-x/no-relative-parent-imports': 'off',
      'import-x/extensions': 'off',
      'n/file-extension-in-import': 'off',
      'no-console': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // The brand-config loader is a sandboxed evaluator: it type-checks a brand's `.ts` config against
    // the schema, then transpiles + evaluates it with an injected require. Dynamic require, the Function
    // evaluator and the local CommonJS `module.exports` interop ARE its purpose, not an oversight.
    files: ['scripts/lib/load-config.ts'],
    rules: {
      'import-x/no-commonjs': 'off',
      'import-x/no-dynamic-require': 'off',
      'security/detect-non-literal-require': 'off',
      'no-new-func': 'off',
      // The whole `typescript` module type is needed for the compiler-API calls (typeof the module).
      'import-x/no-namespace': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
      // The evaluated brand module is untyped by nature — the return is cast to ConfigModule.
      '@typescript-eslint/no-unsafe-call': 'off',
      // typescript is provided by the environment the tool runs in (brand repo / this package's dev
      // deps), resolved dynamically — a deliberate external, not a bundled dependency.
      'n/no-unpublished-import': 'off',
    },
  },
  {
    // Tests (.ts, run via `node --test` type-stripping) are validated by RUNNING, not by tsc — they are
    // deliberately outside the type-checked project (see tsconfig.json). Lint them syntactically only,
    // and grant the same dist-import relaxations the scripts get.
    //
    // Matched by FILENAME, not by directory: specs sit next to the file they test (foo.ts / foo.spec.ts),
    // so there is no folder to scope this to.
    files: ['**/*.spec.ts'],
    ...tsConfigs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: false },
    },
    rules: {
      ...tsConfigs.disableTypeChecked.rules,
      'import-x/no-relative-parent-imports': 'off',
      'import-x/extensions': 'off',
      'n/file-extension-in-import': 'off',
      'no-console': 'off',
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
