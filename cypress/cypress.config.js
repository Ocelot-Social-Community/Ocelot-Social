const { defineConfig } = require("cypress");


module.exports = defineConfig({
  e2e: {
    projectId: "qa7fe2",
    chromeWebSecurity: false,
    baseUrl: "http://localhost:3000",
    specPattern: "**/*.feature",
    supportFile: false,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents,
  },
});
