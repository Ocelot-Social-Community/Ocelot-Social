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
  coverageReporters: ['lcov', 'text'],
  testMatch: ['**/src/**/?(*.)+(spec|test).js?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
}
