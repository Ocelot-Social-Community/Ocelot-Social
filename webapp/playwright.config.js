const { defineConfig, devices } = require('@playwright/test')

/**
 * Visual regression testing for the webapp's Storybook, mirroring packages/ui's setup
 * (packages/ui/playwright.config.ts) — same idea, same tool, applied to this Storybook instead.
 *
 * Tests run against a built, statically-served Storybook (not the dev server): faster and
 * deterministic per navigation, with no webpack-dev-middleware/HMR overhead in the way.
 * Baseline images live in __screenshots__/ next to each *.visual.spec.js and are committed to git.
 */
module.exports = defineConfig({
  testDir: './components',
  testMatch: '**/*.visual.spec.js',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : [['html']],

  use: {
    baseURL: 'http://localhost:6007',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // In CI the Storybook is pre-built by a dedicated workflow step; only the static file server
    // needs to start here. Locally the full build + serve runs so `yarn test:visual` is self-contained.
    command: process.env.CI
      ? 'yarn exec http-server storybook-static -p 6007 -s'
      : 'yarn build-storybook && yarn exec http-server storybook-static -p 6007 -s',
    url: 'http://localhost:6007',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },

  expect: {
    toHaveScreenshot: {
      // Allow slight differences from font rendering/OS-level rendering across machines.
      maxDiffPixelRatio: 0.03,
    },
  },

  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{projectName}/{arg}{ext}',
})
