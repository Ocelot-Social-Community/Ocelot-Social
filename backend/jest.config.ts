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
    '!*.config.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 93,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '\\.gql$': '<rootDir>/test/graphqlTransform.ts',
    '\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
}
