/* eslint-disable import-x/no-commonjs */
const requireJSON5 = require('require-json5')
const { pathsToModuleNameMapper } = require('ts-jest')

const { compilerOptions } = requireJSON5('./tsconfig.json')

module.exports = {
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
    '!eslint.config.ts',
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
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
}
