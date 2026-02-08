const path = require('path')

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
  // IMPORTANT: vueDemiSetup must be FIRST to ensure vue-demi is loaded from webapp's node_modules
  setupFiles: [
    '<rootDir>/test/vueDemiSetup.js',
    '<rootDir>/test/registerContext.js',
    '<rootDir>/test/testSetup.js',
  ],
  transform: {
    '.*\\.(vue)$': '@vue/vue2-jest',
    '^.+\\.js$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  // Transform ESM packages that Jest can't handle natively
  // Note: @ocelot-social/ui is NOT in the exception list because we load from dist/index.cjs
  // which is already CommonJS and doesn't need transformation
  transformIgnorePatterns: ['node_modules/(?!(vue-demi)/)', '<rootDir>/../packages/ui/'],
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    // IMPORTANT: vue-demi must be mapped BEFORE @ocelot-social/ui
    // This ensures that when the UI library's dist/index.cjs calls require("vue-demi"),
    // it gets webapp's Vue 2.7-configured vue-demi instead of UI library's Vue 3 one
    '^vue-demi$': path.resolve(__dirname, 'node_modules/vue-demi/lib/index.cjs'),
    // UI library - use mock that loads dist with correct vue-demi
    '^@ocelot-social/ui$': '<rootDir>/test/__mocks__/@ocelot-social/ui.js',
    '^@ocelot-social/ui/style.css$': 'identity-obj-proxy',
    // Other mappings
    '\\.(svg)$': '<rootDir>/test/fileMock.js',
    '\\.(scss|css|less)$': 'identity-obj-proxy',
    '@mapbox/mapbox-gl-geocoder': 'identity-obj-proxy',
    'vue2-datepicker/locale/undefined': 'vue2-datepicker/locale/en',
    '^@/(.*)$': '<rootDir>/src/$1',
    // jest is unable to build the styleguide on its own, as it uses webpack.
    '^@@/': '<rootDir>/../styleguide/dist/system.umd.min.js',
    '^~/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['js', 'mjs', 'json', 'vue'],
  testEnvironment: 'jest-environment-jsdom',
  snapshotSerializers: ['jest-serializer-vue'],
}
