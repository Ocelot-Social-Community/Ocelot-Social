import { readFileSync } from 'node:fs'

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
  // Resolves the `@src/*`, `@config/*` … aliases straight from tsconfig, so the mapping lives in
  // ONE place instead of being restated here (the Jest setup had to derive it by hand).
  resolve: { tsconfigPaths: true },
  test: {
    // describe/it/expect AND `vi` as globals — matches how the suite was written under Jest and
    // keeps the spec files free of per-file imports for them.
    globals: true,
    environment: 'node',
    // graphql-tools' loadFiles reaches the resolver modules through a dynamic import with an
    // absolute path. Left externalised, that import bypasses Vite's transform and lands in
    // Node's ESM loader, where our extensionless specifiers do not resolve. Inlining the package
    // keeps the whole chain inside the pipeline.
    server: { deps: { inline: ['@graphql-tools/load-files'] } },
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
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/db/**',
        'src/index.ts',
        'src/**/*.d.ts',
        'src/graphql/gql-register.ts',
      ],
      thresholds: {
        lines: 94.3,
      },
    },
  },
})
