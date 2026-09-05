import { readFileSync } from 'node:fs'
import { posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'graphql'
import { defineConfig } from 'vitest/config'

import type { Plugin } from 'vite'
import type { TestUserConfig } from 'vitest/config'

// The reporter list as vitest types it — spelled out so the `['github-actions', { … }]` entry
// below is checked against the tuple form the option object needs, not widened to a bare string.
type Reporters = NonNullable<TestUserConfig['reporters']>

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

// Default for `testTimeout`; see the comment at its use site for how the number was arrived at.
const DEFAULT_TEST_TIMEOUT = 30_000

// The VITEST_TEST_TIMEOUT override, validated rather than passed through `Number()`.
//
// `Number()` maps every typo onto a value vitest accepts silently, and BOTH of them defeat the
// timeout rather than adjusting it (verified against @vitest/runner's `withTimeout`, which reads
// `if (timeout <= 0 || timeout === Infinity) return fn`):
//
//   VITEST_TEST_TIMEOUT=30s  → NaN → not <= 0, so a timer IS armed, with NaN → Node clamps that
//                              to 1ms → every async test fails instantly, for no visible reason
//   VITEST_TEST_TIMEOUT=     → 0   → the guard is removed ENTIRELY → a genuinely hung test hangs
//                              the run forever, which is the one thing this setting exists to stop
//
// `??` does not catch either: it only tests for null/undefined, so an empty variable — the shape
// an unset shell variable takes in most CI templates — sails straight through as 0.
//
// Refused loudly instead of quietly falling back to the default. The override is typed by a human
// at the moment they run the suite; a silent fallback is indistinguishable from it having worked,
// so they would go on believing the longer timeout was in effect while it never was.
const resolveTestTimeout = (): number => {
  // eslint-disable-next-line n/no-process-env
  const raw = process.env.VITEST_TEST_TIMEOUT
  if (raw === undefined) {
    return DEFAULT_TEST_TIMEOUT
  }
  const parsed = Number(raw)
  // isFinite rejects NaN and both infinities; `<= 0` rejects the disable-the-guard values.
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `VITEST_TEST_TIMEOUT must be a positive number of milliseconds, got ${JSON.stringify(raw)}`,
    )
  }
  return parsed
}

// GitHub attaches an `::error` annotation to a diff line only when its `file=` is relative to the
// WORKSPACE root. Vitest reports the absolute path of the running process, and in CI that process
// lives inside the backend container, where this file is `/app/src/…` — a path the workspace has
// never heard of, so the annotation would show up in the run summary detached from any file.
//
// Rewritten to `backend/src/…` here. Relative-to-cwd plus the `backend/` prefix is correct for
// BOTH shapes this can run in, because either way the suite is started from the backend directory:
// in the container cwd is `/app` (→ `src/…`), on a runner without the container it is
// `<workspace>/backend` (→ `src/…` as well). Separators are forced to POSIX because GitHub parses
// the annotation path that way regardless of the runner OS.
const toWorkspacePath = (file: string): string =>
  posix.join('backend', relative(process.cwd(), file).split(sep).join(posix.sep))

// Assembled here rather than passed per-script as `--reporter` flags, for one blunt reason: the
// github-actions reporter needs an OPTION (onWritePath above) and a CLI flag cannot carry one.
// A `--reporter` on the command line also REPLACES this list wholesale rather than adding to it,
// so the two cannot be mixed — everything lives here, switched by environment.
const reporters: Reporters = [
  // Always on. Without it a failing run prints nothing usable: `blob` alone emits a single
  // "blob report written to …" line whatever the outcome, which is how a red shard used to end at
  // `Error: Process completed with exit code 1` with no indication of which test failed.
  'default',
  // The machine-readable report `test:merge` consumes via `--merge-reports`. Only in shard mode —
  // set by the `test:shard` script, which is the only caller that produces one.
  // eslint-disable-next-line n/no-process-env
  ...(process.env.VITEST_BLOB_REPORT === 'true' ? ['blob'] : []),
  // Inline annotations on the pull request. Vitest adds this reporter itself when it detects
  // Actions, but only while the reporter list is untouched — naming any reporter explicitly (as
  // this file does) opts out of that, so it is named explicitly too.
  // eslint-disable-next-line n/no-process-env
  ...(process.env.GITHUB_ACTIONS === 'true'
    ? ([['github-actions', { onWritePath: toWorkspacePath }]] satisfies Reporters)
    : []),
]

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
    reporters,
    // Inherited from `jest.setTimeout(10000)` in test/setup.ts (whose only content that was, so
    // the file is gone). The value has been raised because 10000 was not a limit any more, it was
    // the measurement: "embeds > given a youtube link" costs 10.6–10.8s on a developer machine
    // (measured over three runs), i.e. the suite passed or failed on which side of 10s the
    // machine happened to land that minute. metascraper parses a full page snapshot through
    // thirteen rules including language detection — that is the cost, not a hang.
    //
    // A timeout has to sit ABOVE the measured cost with headroom, the same way the coverage
    // thresholds sit at the measured value: too tight and it reports load rather than defects.
    // 30s is ~3x the slowest test and still short enough that a genuinely hung test fails the
    // run quickly. Overridable for a slow CI runner or a debugging session without editing this
    // file — raising it there must not require a commit.
    testTimeout: resolveTestTimeout(),
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
      // All four metrics at 100 — what a full run measures (4422 statements, 2162 branches, 982
      // functions). This replaces the earlier "floor with headroom" setting (96/96/90/96.4):
      // headroom is only useful while a gap exists, and once the gap is closed the same slack
      // just lets it reopen silently — a few hundred lines of error handling could go without
      // the gate saying anything.
      //
      // `branches` is the one that carries the weight, and the one a happy-path test cannot
      // fake: a file can shed its whole error handling while `lines` stays put, because those
      // paths sit on lines some other test already walks.
      //
      // The consequence, and the point: a genuinely unreachable line now has to be marked
      // `/* v8 ignore next -- <why> */` AT THE SITE rather than disappearing into the slack.
      // Every such marker in src/ names the invariant that makes it unreachable (a shield rule,
      // a schema non-null, a drift test), so the claim is reviewable — and when the invariant
      // goes, the marker is what points at the code that now needs a test.
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 100,
        functions: 100,
      },
    },
  },
})
