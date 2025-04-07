/* eslint-disable import/no-commonjs */
const { pathsToModuleNameMapper } = require('ts-jest')
const requireJSON5 = require('require-json5')
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
  ],
  coverageThreshold: {
    global: {
      lines: 90,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
}
