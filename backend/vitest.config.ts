import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { parse } from 'graphql'
import { defineConfig } from 'vitest/config'

import type { Plugin } from 'vite'

// `.gql` documents are imported as modules by the specs (and by db/seed). Vite has no idea what
// that extension is, so it gets a transform of its own — the direct replacement for the Jest
// transform this project used, emitting the parsed DocumentNode as the default export.
const graphqlPlugin = (): Plugin => ({
  name: 'ocelot-gql',
  transform(_code, id) {
    if (!id.endsWith('.gql')) {
      return null
    }
    // Read from disk rather than trusting `_code`: Vite hands over the raw file either way, but
    // the explicit read keeps the failure message pointing at the file that would not parse.
    // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename
    const source = readFileSync(id, 'utf-8')
    try {
      return { code: `export default ${JSON.stringify(parse(source))}`, map: null }
    } catch (error: unknown) {
      throw new Error(
        `Failed to parse ${id}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }
  },
})

export default defineConfig({
  plugins: [graphqlPlugin()],
  resolve: {
    // Resolves the `@src/*`, `@config/*` … aliases straight from tsconfig, so the mapping lives
    // in ONE place instead of being restated here (the Jest setup had to derive it by hand).
    tsconfigPaths: true,
    alias: {
      // Pin graphql to its CommonJS entry. The package ships both (`main: index`, `module:
      // index.mjs`) with no `exports` map to arbitrate, so Vite-processed code would take the ESM
      // one while externalised code takes CJS — two live instances, and graphql's `instanceOf`
      // then rejects a type built by "the other" ("Cannot use GraphQLObjectType … from another
      // module or realm"). CJS is the side that must win: permissionsMiddleware reaches
      // graphql-shield through createRequire (its ESM build is broken), which is CommonJS and
      // cannot be talked out of it.
      graphql: fileURLToPath(new URL('./node_modules/graphql/index.js', import.meta.url)),
    },
  },
  test: {
    // describe/it/expect AND `vi` as globals — matches how the suite was written under Jest and
    // keeps the spec files free of per-file imports for them.
    globals: true,
    environment: 'node',
    // These have to run through Vite rather than being externalised, for two separate reasons.
    //
    // load-files reaches the resolver modules through a dynamic import with an absolute path;
    // externalised, that import lands in Node's ESM loader, where our extensionless specifiers
    // do not resolve.
    //
    // The rest is the dual-package hazard: `graphql` ships a CJS (`main`) and an ESM (`module`)
    // build from ONE install and has no `exports` map to arbitrate. Vite-processed code picks the
    // ESM entry, externalised code the CJS one — two live instances of the same package, and
    // graphql's own `instanceOf` then rejects a type built by "the other" with the misleading
    // "Cannot use GraphQLObjectType … from another module or realm". Naming the graphql-tools
    // packages explicitly (a `/^@graphql-tools\//` regex does NOT match here) puts schema
    // construction and schema printing on the same instance.
    server: {
      deps: {
        inline: ['@graphql-tools/load-files'],
      },
    },
    include: ['src/**/*.{spec,test}.ts'],
    // Was `jest.setTimeout(10000)` in test/setup.ts, whose only content that was — so that file
    // is gone. The reason is unchanged: metascraper parsing in the embeds specs runs close to
    // the default limit.
    testTimeout: 10000,
    // The suite talks to one shared Neo4j and the specs clean it between cases, so they cannot
    // run concurrently — this is the equivalent of Jest's `--runInBand`, which the `test` script
    // passed for exactly that reason.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // Do NOT wipe the reports directory first. vitest cleans it by default, but in the compose
      // test setup `./coverage` is bind-mounted to `/app/coverage` — removing a mount point fails
      // with EBUSY and takes the whole run with it. Jest wrote into the directory without
      // clearing it, so leaving it in place also keeps the previous behaviour.
      clean: false,
      // `json` alongside the summary: it is the only one of the three that carries per-line
      // detail. `text` is readable but truncates in the CI log, and `json-summary` stops at
      // percentages per file — neither can answer "which lines are still uncovered", which is
      // exactly the question when closing gaps. coverage-final.json is uploaded as an artifact
      // by the coverage job, so that question is answerable without re-running the suite.
      reporter: ['text', 'json-summary', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/db/**',
        'src/index.ts',
        'src/**/*.d.ts',
        'src/graphql/gql-register.ts',
      ],
      // All four metrics, not just lines. `lines` alone left branch coverage completely
      // unguarded, and that is where the gap actually is — 306 uncovered branches against 224
      // uncovered lines. A file could lose half its error paths without the gate noticing, as
      // long as those paths sit on lines some happy-path test already walks.
      //
      // Each value sits below a MEASURED full-suite run with real headroom, not on it: a
      // threshold set at the current number turns any line executed only on some timings into a
      // red build. The measured run was lines 96.27 / statements 96.35 / branches 90.38 /
      // functions 96.76, and it is a FLOOR — one spec file (embeds) failed locally for want of
      // network, so CI reads at or above it.
      //
      // `branches` is the one that matters most here and the one that was missing entirely until
      // recently: it sat at 86.25% while lines already read 94.84%, i.e. a file could shed its
      // whole error handling unnoticed as long as some happy-path test walked those lines.
      thresholds: {
        lines: 96,
        statements: 96,
        branches: 90,
        functions: 96.4,
      },
    },
  },
})
