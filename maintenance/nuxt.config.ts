import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  devServer: { host: "0.0.0.0" },
  modules: ["@nuxt/eslint", "@nuxtjs/i18n"],
  css: ["~/assets/css/branding.css", "~/assets/css/main.css", "@ocelot-social/ui/style.css"],
  i18n: {
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "de", name: "Deutsch", file: "de.json" },
      { code: "es", name: "Español", file: "es.json" },
      { code: "fr", name: "Français", file: "fr.json" },
      { code: "it", name: "Italiano", file: "it.json" },
      { code: "nl", name: "Nederlands", file: "nl.json" },
      { code: "pl", name: "Polski", file: "pl.json" },
      { code: "pt", name: "Português", file: "pt.json" },
      { code: "ru", name: "Русский", file: "ru.json" },
      { code: "sq", name: "Shqip", file: "sq.json" },
      { code: "uk", name: "Українська", file: "uk.json" },
    ],
    defaultLocale: "en",
    strategy: "no_prefix",
    langDir: "../locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "locale",
      fallbackLocale: "en",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Pre-bundle for dev server (avoids re-processing minified code)
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "@ocelot-social/ui",
        "@ocelot-social/ui/ocelot",
        "floating-vue",
      ],
    },
    server: {
      fs: {
        allow: ["/packages/ui"],
      },
    },
    build: {
      rollupOptions: {
        // Exclude pre-built UI library from Rollup re-bundling in production
        // (minified tailwind-merge variable `h` collides with Vue's `h`)
        external: [/^@ocelot-social\/ui/],
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
