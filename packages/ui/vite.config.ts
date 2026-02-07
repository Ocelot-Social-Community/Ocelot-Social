import { exec } from 'node:child_process'
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const execAsync = promisify(exec)

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    tsconfigPaths(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue', 'src/**/*.d.ts'],
      outDir: 'dist',
      rollupTypes: true,
      copyDtsFiles: true,
      afterBuild: async () => {
        // Generate .d.cts files for CJS compatibility
        await copyFile('dist/index.d.ts', 'dist/index.d.cts')
        await copyFile('dist/tailwind.preset.d.ts', 'dist/tailwind.preset.d.cts')
      },
    }),
    // Build CSS separately using Tailwind CLI
    {
      name: 'build-css',
      closeBundle: async () => {
        await execAsync('npx @tailwindcss/cli -i src/styles/index.css -o dist/style.css --minify')
      },
    },
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'tailwind.preset': resolve(__dirname, 'src/tailwind.preset.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'vue-demi', 'tailwindcss'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-demi': 'VueDemi',
        },
        assetFileNames: '[name].[ext]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/**/*.visual.spec.ts'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.ts',
        'src/**/*.stories.ts',
        'src/**/index.ts',
        'src/test/**',
      ],
      thresholds: {
        100: true,
      },
    },
  },
})
