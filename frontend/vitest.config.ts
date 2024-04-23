import { defineConfig, mergeConfig, configDefaults } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: [
        'scripts/tests/mock.$t.ts',
        'scripts/tests/mock.vikePageContext.ts',
        'scripts/tests/plugin.pinia.ts',
        'scripts/tests/plugin.i18n-vuetify.ts',
      ],
      coverage: {
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        exclude: [
          ...configDefaults.exclude,
          // storybook
          '**/*{.,-}stories.?(c|m)[jt]s?(x)',
          'src/stories/**/*',
          // scripts
          'src/assets/icons/helpers/convertSvgToVue.js',
        ],
        thresholds: {
          lines: 84,
          // functions: 20, // has problems see https://github.com/vitest-dev/vitest/issues/3607
          branches: 89,
          statements: 84,
        },
      },
    },
  }),
)
