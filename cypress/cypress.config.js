const dotenv = require('dotenv')
const { defineConfig } = require("cypress");
const browserify = require("@badeball/cypress-cucumber-preprocessor/browserify");
const { addCucumberPreprocessorPlugin } = require("@badeball/cypress-cucumber-preprocessor");

// Test persistent(between commands) store
const testStore = {}

async function setupNodeEvents(on, config) {
  await addCucumberPreprocessorPlugin(on, config);

  on("file:preprocessor", browserify.default(config));

  on("task", {
    pushValue({ name, value }) {
      testStore[name] = value
      return true
    },
    getValue(name) {
      console.log("getValue",name,testStore)
      return testStore[name]
    },
  });
  
  return config;
}

// Import backend .env (smart)?
const { parsed } = dotenv.config({ path: '../backend/.env' })

module.exports = defineConfig({
  e2e: {
    projectId: "qa7fe2",
    defaultCommandTimeout: 120000,
    pageLoadTimeout:180000,
    chromeWebSecurity: false,
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.feature",
    supportFile: "cypress/support/e2e.js",
    retries:  0,
    video: false,
    setupNodeEvents,
  },
  env: parsed
});
