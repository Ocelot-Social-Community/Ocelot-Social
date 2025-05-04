const dotenv = require('dotenv')
const { defineConfig } = require('cypress');
const browserify = require('@cypress/browserify-preprocessor');
const {
  addCucumberPreprocessorPlugin,
} = require('@badeball/cypress-cucumber-preprocessor');
const {
  preprendTransformerToOptions,
} = require('@badeball/cypress-cucumber-preprocessor/browserify');

// Test persistent(between commands) store
const testStore = {}

async function setupNodeEvents(on, config) {
  await addCucumberPreprocessorPlugin(on, config);

  on(
    'file:preprocessor',
    browserify(preprendTransformerToOptions(config, browserify.defaultOptions)),
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
    supportFile: 'cypress/support/e2e.js',
    retries:  0,
    video: false,
    viewportHeight: 720,
    viewportWidth: 1290,
    setupNodeEvents,
  },
  env: parsed
});