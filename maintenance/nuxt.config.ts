import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: { host: "0.0.0.0" },
  modules: ["@nuxt/eslint"],
  css: ["~/assets/css/branding.css", "~/assets/css/main.css", "@ocelot-social/ui/style.css"],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["@vue/devtools-core", "@vue/devtools-kit"],
    },
    server: {
      fs: {
        allow: ["/packages/ui"],
      },
    },
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
