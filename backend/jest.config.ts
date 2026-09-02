import { readFileSync } from 'node:fs'

import { pathsToModuleNameMapper } from 'ts-jest'
import { parseConfigFileTextToJson } from 'typescript'

// eslint-disable-next-line n/no-sync -- config files are synchronous by nature
const tsconfigText = readFileSync('./tsconfig.json', 'utf-8')
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- parseConfigFileTextToJson returns untyped config
const { config } = parseConfigFileTextToJson('tsconfig.json', tsconfigText)
const paths = (config as { compilerOptions: { paths: Record<string, string[]> } }).compilerOptions
  .paths

// Under ESM every intra-project specifier carries a `.js` extension, but the file on disk is
// `.ts`. Jest resolves the mapped path literally, so each alias needs a `.js`-stripping variant
// AHEAD of the plain one (moduleNameMapper does not chain — the first match wins and its result
// is used as-is). `pathsToModuleNameMapper` only emits the plain form, hence this expansion.
const aliasMapper = Object.entries(pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' })).reduce<
  Record<string, string>
>((mapper, [pattern, target]) => {
  const stripped = pattern.replace(/\$$/, '')
  return {
    ...mapper,
    [`${stripped}\\.js$`]: target as string,
    [pattern]: target as string,
  }
}, {})

export default {
  verbose: true,
  // ESM. `default-esm` flips ts-jest to ESM output; `extensionsToTreatAsEsm` tells Jest to load
  // the compiled `.ts` as a module rather than wrapping it in a CommonJS shim. Requires Node to
  // run with `--experimental-vm-modules` (set in the `test` script).
  preset: 'ts-jest/presets/default-esm',
  // `.gql` too: its transform emits `export default …`, so Jest must not parse the result
  // as CommonJS ("Unexpected export statement in CJS module").
  extensionsToTreatAsEsm: ['.ts', '.gql'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/build/**',
    '!**/src/**/?(*.)+(spec|test).ts?(x)',
    '!**/src/db/**',
    '!**/src/index.ts',
    '!*.config.ts',
    '!**/*.d.ts',
    '!**/gql-register.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 95,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '\\.gql$': '<rootDir>/test/graphqlTransform.ts',
    '\\.tsx?$': ['ts-jest', { useESM: true }],
    // `uuid` (since v12) and `@faker-js/faker` (since v10, whose `exports` map lost the
    // `require` condition) are ESM-only and ship no CommonJS build. Jest runs the suite
    // as CommonJS, so those packages have to be down-compiled on the way in — see
    // `transformIgnorePatterns` below, which is what lets this rule see them at all.
    '\\.jsx?$': ['ts-jest', { useESM: true, tsconfig: { allowJs: true, checkJs: false } }],
  },
  // Default is to skip all of `node_modules`; carve out the ESM-only packages so the
  // `\\.jsx?$` transform above applies to them. `htmlparser2` and its `dom*`/`entities`
  // dependencies arrive through `sanitize-html`, which moved to the ESM-only
  // `htmlparser2@12` line — Node copes via `require(esm)`, Jest's CommonJS runtime
  // does not. They install *nested* under `sanitize-html/node_modules/`, hence the
  // optional `.*/node_modules/` prefix in the lookahead: without it the outer
  // `/node_modules/sanitize-html/` segment already matches and the nested package
  // stays ignored. `@faker-js/faker` is scoped, so it needs both path segments here.
  transformIgnorePatterns: [
    '/node_modules/(?!(.*/node_modules/)?(@faker-js/faker|uuid|htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)/)',
  ],
  moduleNameMapper: {
    ...aliasMapper,
    // Same problem for relative specifiers: './foo.js' is on disk as './foo.ts'.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
