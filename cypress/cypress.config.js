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

  on("after:run", (results) => {
    if (results) {
      console.log(results.status);
    }
  });

  return config;
}

module.exports = defineConfig({
  e2e: {
    projectId: "qa7fe2",
    chromeWebSecurity: false,
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.feature",
    supportFile: "cypress/support/e2e.js",
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: false,
    setupNodeEvents,
  },
});