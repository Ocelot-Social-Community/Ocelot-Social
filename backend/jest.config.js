module.exports = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/dist/**',
    '!**/src/**/?(*.)+(spec|test).js?(x)'
  ],
  coverageThreshold: {
    global: {
      lines: 57,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).js?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
}
