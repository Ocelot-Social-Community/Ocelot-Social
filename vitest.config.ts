import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['scripts/tests/mock.$t.ts', 'scripts/tests/plugin.vuetify.ts'],
      coverage: {
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        lines: 2,
        functions: 0,
        branches: 8,
        statements: 2,
        // 100: true,
      },
    },
  }),
)
