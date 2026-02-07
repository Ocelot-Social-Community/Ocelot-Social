import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression testing configuration for @ocelot-social/ui
 *
 * Tests run against Storybook to capture component screenshots.
 * Baseline images are stored in e2e/__screenshots__ and committed to git.
 */
export default defineConfig({
  testDir: './src/components',
  testMatch: '**/*.visual.spec.ts',

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter to use */
  reporter: process.env.CI ? 'github' : 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for Storybook */
    baseURL: 'http://localhost:6006',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run Storybook before starting the tests */
  webServer: {
    command: 'npm run storybook:build && npx http-server storybook-static -p 6006 -s',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Snapshot configuration */
  expect: {
    toHaveScreenshot: {
      /* Allow slight differences due to anti-aliasing */
      maxDiffPixelRatio: 0.01,
    },
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results',

  /* Snapshot path template - colocated with component */
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{projectName}/{arg}{ext}',
})
