const { defineConfig } = require("cypress");
const browserify = require("@badeball/cypress-cucumber-preprocessor/browserify");
const { addCucumberPreprocessorPlugin } = require("@badeball/cypress-cucumber-preprocessor");

const dotenv = require('dotenv');

// Import backend .env (smart)?
const { parsed } = dotenv.config({ path: require.resolve('../backend/.env') });

// Test persistent(between commands) store
const testStore = {}

async function setupNodeEvents(on, config) {
  await addCucumberPreprocessorPlugin(on, config);

  on("file:preprocessor", browserify.default(config));

  config.env.NEO4J_URI = parsed.NEO4J_URI
  config.env.NEO4J_USERNAME = parsed.NEO4J_USERNAME
  config.env.NEO4J_PASSWORD = parsed.NEO4J_PASSWORD
  config.env.JWT_SECRET = parsed.JWT_SECRET

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
    specPattern: "**/*.feature",
    supportFile: "cypress/support/e2e.js",
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents,
  },
});
