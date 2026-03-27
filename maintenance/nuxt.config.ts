// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint"],
  css: ["@ocelot-social/ui/style.css"],
  vite: {
    build: {
      rollupOptions: {
        // Exclude pre-bundled UI library from Rollup processing
        // (minified tailwind-merge variable `h` collides with Vue's `h`)
        external: ["@ocelot-social/ui"],
      },
    },
  },
  eslint: {
    config: {
      typescript: {
        strict: true,
      },
    },
  },
});
