const dotenv = require('dotenv')
const { defineConfig } = require('cypress');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');
const {
  addCucumberPreprocessorPlugin,
} = require('@badeball/cypress-cucumber-preprocessor');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

// Test persistent(between commands) store
const testStore = {}

async function setupNodeEvents(on, config) {
  // This is required for the preprocessor to be able to generate JSON reports after each run, and more
  await addCucumberPreprocessorPlugin(on, config);

  on(
    'file:preprocessor',
    webpackPreprocessor({
      webpackOptions: {
        mode: 'development',
        devtool: 'eval-source-map',
        resolve: {
          extensions: ['.js', '.json'],
          fallback: {
            fs: false,
            net: false,
            tls: false,
          },
        },
        module: {
          rules: [
            {
              test: /\.feature$/,
              use: [
                {
                  loader: '@badeball/cypress-cucumber-preprocessor/webpack',
                  options: config,
                },
              ],
            },
          ],
        },
        plugins: [
          new NodePolyfillPlugin(),
          new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
          }),
        ],
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

  // Chromium-family browser flags so PreJoin's getUserMedia/enumerateDevices
  // resolve against synthetic fake devices instead of prompting or failing
  // outright in headless mode. Tier B (Fake-Devices) of the video-call e2e
  // strategy depends on this; without it PreJoin lands in the
  // "errorDenied"/"errorNoDevice" branch and we can't exercise the happy path.
  //
  // Note: Electron (Cypress' default browser) **does not honor
  // launchOptions.args** and prints "browser launch options ... not
  // supported by electron". The chrome/chromium browsers do honor them —
  // so this hook still earns its keep when the spec is run with
  // `--browser chrome` locally or in CI. For the bundled Electron run,
  // permissions are auto-granted by Cypress, so we tolerate the case
  // where the test gracefully falls into the "prompt" status path.
  on('before:browser:launch', (browser = {}, launchOptions) => {
    if (browser.family === 'chromium' && browser.name !== 'electron') {
      launchOptions.args.push('--use-fake-ui-for-media-stream')
      launchOptions.args.push('--use-fake-device-for-media-stream')
      // Headless Chromium needs --autoplay-policy=no-user-gesture-required so
      // PreJoin's AudioContext can resume without a synthetic user gesture.
      launchOptions.args.push('--autoplay-policy=no-user-gesture-required')
      // Force English locale so i18n-dependent assertions in feature files
      // match English strings regardless of the host system language.
      launchOptions.args.push('--lang=en-US')
    }
    return launchOptions
  })

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