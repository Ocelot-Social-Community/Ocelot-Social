import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['tests/mock.$t.ts', 'tests/plugin.vuetify.ts'],
      coverage: {
        all: true,
        include: ['src/**/*.{js,jsx,ts,tsx,vue}'],
        lines: 5,
        functions: 0,
        branches: 10,
        statements: 5,
        // 100: true,
      },
    },
  }),
)
