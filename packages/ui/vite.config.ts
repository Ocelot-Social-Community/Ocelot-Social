import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

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
    }),
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
        assetFileNames: 'style.[ext]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.ts',
        'src/**/index.ts',
      ],
    },
  },
})
