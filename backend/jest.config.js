module.exports = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/build/**',
    '!**/src/**/?(*.)+(spec|test).ts?(x)'
  ],
  coverageThreshold: {
    global: {
      lines: 57,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
}
