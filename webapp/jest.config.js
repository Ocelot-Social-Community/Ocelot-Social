module.exports = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,vue}',
    '!**/?(*.)+(spec|test|story).js?(x)',
    '!**/node_modules/**',
    '!**/.nuxt/**',
    '!**/storybook/**',
    '!**/coverage/**',
    '!**/config/**',
    '!**/maintenance/**',
    '!**/plugins/**',
    '!**/.eslintrc.js',
    '!**/.prettierrc.js',
    '!**/nuxt.config.js',
  ],
  coverageThreshold: {
    global: {
      lines: 82,
    },
  },
  coverageProvider: 'v8',
  setupFiles: ['<rootDir>/test/registerContext.js', '<rootDir>/test/testSetup.js'],
  transform: {
    '.*\\.(vue)$': '@vue/vue2-jest',
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/test/fileMock.js',
    '\\.(scss|css|less)$': 'identity-obj-proxy',
    '@mapbox/mapbox-gl-geocoder': 'identity-obj-proxy',
    'vue2-datepicker/locale/undefined': 'vue2-datepicker/locale/en',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['js', 'json', 'vue'],
  testEnvironment: 'jest-environment-jsdom',
  snapshotSerializers: ['jest-serializer-vue'],
}
