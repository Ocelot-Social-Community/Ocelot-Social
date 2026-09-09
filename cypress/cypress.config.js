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
            // 'process/browser.js', not 'process/browser': the backend build is ESM since
            // backend/package.json declares `"type": "module"`, so webpack treats the modules
            // this plugin injects into as strict ESM and enforces fullySpecified — a deep path
            // into a package then needs its extension. ('buffer' is unaffected: it resolves
            // through the package entry, not a subpath.)
            process: 'process/browser.js',
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
    // Mints the auth cookie's JWT for "I am logged in as <slug>". This runs in NODE, on
    // purpose: from jsonwebtoken 9 `sign` checks `secretOrPrivateKey instanceof KeyObject`
    // with KeyObject taken from `crypto`, and the browser polyfill NodePolyfillPlugin
    // substitutes (crypto-browserify) has no such export — `instanceof undefined` then throws
    // "Right-hand side of 'instanceof' is not an object" for every logged-in step.
    //
    // `config` is read HERE rather than passed in by the step, so that JWT_SECRET never has to
    // reach the browser. There is no second source: the backend's config module falls back to
    // process.env outside Cypress, and the `dotenv.config({ path: '../backend/.env' })` below runs
    // at load time of this file — so it reads the very same file the exposed values come from.
    // Both requires are lazy so `cypress open` still starts when backend/build is absent.
    signToken({ user }) {
      const { encode } = require('../backend/build/src/jwt/encode')
      const { default: config } = require('../backend/build/src/config/index')
      return encode({ config })(user)
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

// What the spec bundle is allowed to see. NOT the whole `parsed` map: the e2e specs pull the
// backend's config module into the BROWSER (support/factories.js → db/factories → db/neo4j →
// config), so every key handed over here ends up readable in the test browser. Handing over the
// whole .env put SMTP credentials — including SMTP_DKIM_PRIVATEKEY — Redis, LiveKit and Sentry
// values there as well, none of which any spec reads.
//
// The two groups below are NOT interchangeable:
//   - REAL: the keys the browser bundle actually reads.
//   - PLACEHOLDER: keys no spec reads, but which `assertRequiredConfig` (backend/src/config/index.ts)
//     demands at import time — it throws `ERROR: "<KEY>" env variable is missing.` for a missing or
//     empty one, and because the import happens while the spec is being loaded that failure shows up
//     as "an uncaught error outside of a test", killing the whole file before any scenario runs.
//     They therefore need SOME truthy value, but not the real one.
//
// Drift is self-announcing: a new required variable in the backend config produces exactly that
// loud, immediate error on the first spec rather than a subtle mis-run.
const PLACEHOLDER = 'unused-in-e2e'
const exposedToSpecs = {
  // --- real ---
  NODE_ENV: parsed.NODE_ENV,
  CLIENT_URI: parsed.CLIENT_URI,
  GRAPHQL_URI: parsed.GRAPHQL_URI,
  PRODUCTION_DB_CLEAN_ALLOW: parsed.PRODUCTION_DB_CLEAN_ALLOW,
  // The fixtures talk to neo4j straight from the browser, so these cannot be withheld without
  // moving fixture setup into a Node task.
  NEO4J_URI: parsed.NEO4J_URI,
  NEO4J_USERNAME: parsed.NEO4J_USERNAME,
  NEO4J_PASSWORD: parsed.NEO4J_PASSWORD,
  // --- placeholder: required by config, read by nobody in the browser ---
  // JWT_SECRET among them: the token is signed by the `signToken` task in Node, which reads the
  // real value itself.
  JWT_SECRET: PLACEHOLDER,
  EMAIL_DEFAULT_SENDER: PLACEHOLDER,
  AWS_ACCESS_KEY_ID: PLACEHOLDER,
  AWS_SECRET_ACCESS_KEY: PLACEHOLDER,
  AWS_ENDPOINT: PLACEHOLDER,
  AWS_REGION: PLACEHOLDER,
  AWS_BUCKET: PLACEHOLDER,
  IMAGOR_PUBLIC_URL: PLACEHOLDER,
  IMAGOR_SECRET: PLACEHOLDER,
  MAPBOX_TOKEN: PLACEHOLDER,
}

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
  // `expose`, not `env`: Cypress 16 removed `Cypress.env()` and split it in two. `expose` is the
  // synchronous, browser-readable half — the only one the backend's config module can use, since it
  // reads its values at import time (see backend/src/config/index.ts). The other half, `cy.env()`,
  // is an async command and deliberately reaches nothing outside a test body.
  expose: exposedToSpecs
});