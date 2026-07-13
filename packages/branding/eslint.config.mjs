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
import { plugin as tseslintPlugin } from 'typescript-eslint'

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
    },
  },
  {
    // Hoisted function declarations may be referenced above their definition (discover.ts orders its
    // public API before private helpers on purpose). Variables/classes are still guarded. Scoped to a
    // block that registers the tseslint plugin (flat-config requires the plugin in the same object).
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': tseslintPlugin },
    rules: {
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    },
  },
  {
    // Build scripts + node:test files import the COMPILED `../dist` by explicit path — mandatory for
    // ESM Node, and there is no in-package alias to route through. (src/*.ts uses extensionless relative
    // imports and is unaffected.) They also legitimately write to stdout.
    files: ['scripts/**/*.mjs', 'test/**/*.mjs'],
    rules: {
      'import-x/no-relative-parent-imports': 'off',
      'import-x/extensions': 'off',
      'n/file-extension-in-import': 'off',
      'no-console': 'off',
    },
  },
  {
    // The brand-config loader is a sandboxed evaluator: it type-checks a brand's `.ts` config against
    // the schema, then transpiles + evaluates it with an injected require. Dynamic require, the Function
    // evaluator and the local CommonJS `module.exports` interop ARE its purpose, not an oversight.
    files: ['scripts/lib/load-config.mjs'],
    rules: {
      'import-x/no-commonjs': 'off',
      'import-x/no-dynamic-require': 'off',
      'security/detect-non-literal-require': 'off',
      'no-new-func': 'off',
    },
  },
]
