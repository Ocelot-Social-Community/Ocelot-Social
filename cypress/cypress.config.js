const dotenv = require('dotenv')
const { defineConfig } = require('cypress');
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor');
const {
  addCucumberPreprocessorPlugin,
} = require('@badeball/cypress-cucumber-preprocessor');
const {
  createEsbuildPlugin,
} = require('@badeball/cypress-cucumber-preprocessor/esbuild');
const {
  NodeModulesPolyfillPlugin,
} = require('@esbuild-plugins/node-modules-polyfill');
const {
  NodeGlobalsPolyfillPlugin,
} = require('@esbuild-plugins/node-globals-polyfill');

// Test persistent(between commands) store
const testStore = {}

async function setupNodeEvents(on, config) {
  // This is required for the preprocessor to be able to generate JSON reports after each run, and more
  await addCucumberPreprocessorPlugin(on, config);

  on(
    'file:preprocessor',
    createBundler({
      // NodeGlobalsPolyfillPlugin provides browser-compatible polyfills for Node.js globals (Buffer, process)
      // NodeModulesPolyfillPlugin provides browser-compatible polyfills for Node.js built-in modules
      // (fs, path, crypto, etc.) required when importing backend code
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin(),
        createEsbuildPlugin(config),
      ],
      define: {
        global: 'globalThis',
      },
    }),
  );

  on('task', {
    pushValue({ name, value }) {
      testStore[name] = value
      return true
    },
    getValue(name) {
      console.log('getValue',name,testStore)
      return testStore[name]
    },
  });
  
  return config;
}

// Import backend .env (smart)?
const { parsed } = dotenv.config({ path: '../backend/.env' })

module.exports = defineConfig({
  e2e: {
    projectId: 'qa7fe2',
    defaultCommandTimeout: 60000,
    pageLoadTimeout:180000,
    chromeWebSecurity: false,
    baseUrl: 'http://localhost:3000',
    specPattern: '**/*.feature',
    supportFile: false,
    retries:  0,
    video: false,
    viewportHeight: 720,
    viewportWidth: 1290,
    setupNodeEvents,
  },
  env: parsed
});