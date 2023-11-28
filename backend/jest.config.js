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
    '!**/src/db/**'    
  ],
  coverageThreshold: {
    global: {
      lines: 90,
    },
  },
  testMatch: ['**/src/**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
}
