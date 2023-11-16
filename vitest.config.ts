import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['tests/unit.setup.ts'],
      /*
      server: {
        deps: {
          inline: ['vuetify'],
        },
      },
      */
    },
  }),
)
