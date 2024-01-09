import { defineConfig, mergeConfig, configDefaults } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['scripts/tests/mock.$t.ts', 'scripts/tests/mock.vikePageContext.ts', 'scripts/tests/plugin.vuetify.ts'],
      coverage: {
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        exclude: [
          ...configDefaults.exclude,
          // storybook
          '**/*{.,-}stories.?(c|m)[jt]s?(x)',
          'src/stories/**/*',
        ],
        thresholds: {
          lines: 25,
          // functions: 20, // has problems see https://github.com/vitest-dev/vitest/issues/3607
          branches: 60,
          statements: 25,
        },
      },
    },
  }),
)
