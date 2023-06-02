module.exports = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/build/**',
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
