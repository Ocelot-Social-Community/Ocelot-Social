import { readFileSync } from 'node:fs'

import { pathsToModuleNameMapper } from 'ts-jest'
import { parseConfigFileTextToJson } from 'typescript'

// eslint-disable-next-line n/no-sync -- config files are synchronous by nature
const tsconfigText = readFileSync('./tsconfig.json', 'utf-8')
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- parseConfigFileTextToJson returns untyped config
const { config } = parseConfigFileTextToJson('tsconfig.json', tsconfigText)
const paths = (config as { compilerOptions: { paths: Record<string, string[]> } }).compilerOptions
  .paths

export default {
  verbose: true,
  preset: 'ts-jest',
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
    '\\.tsx?$': 'ts-jest',
    // `uuid` (since v12) and `@faker-js/faker` (since v10, whose `exports` map lost the
    // `require` condition) are ESM-only and ship no CommonJS build. Jest runs the suite
    // as CommonJS, so those packages have to be down-compiled on the way in — see
    // `transformIgnorePatterns` below, which is what lets this rule see them at all.
    '\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true, checkJs: false } }],
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
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
}
