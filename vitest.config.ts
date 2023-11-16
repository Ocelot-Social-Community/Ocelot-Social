import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue' // Import the plugin here

export default defineConfig({
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
  plugins: [vue()], // Include it in your array of plugins here
})
