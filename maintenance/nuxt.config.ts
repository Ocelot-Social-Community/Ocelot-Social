import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";

// Branding is applied at BUILD time by build-maintenance-branding.ts (the page is static and is shown
// precisely when the backend is unreachable, so it cannot fetch anything at runtime). Everything the
// generator writes is a SEPARATE, git-ignored file that this config picks up only when present — no
// committed source is ever edited, and removing the files is a complete reset.
const has = (rel: string): boolean =>
  existsSync(fileURLToPath(new URL(rel, import.meta.url)));

// The brand's :root tokens + @font-face rules. LAST in the css list so its :root wins over the
// vanilla one — same reason the generated block used to sit at the end of branding.css.
const brandCss = has("app/assets/css/brand.css") ? ["~/assets/css/brand.css"] : [];

// Per-locale overlays holding just the namespaces this page renders. `files` is a merge list: the
// vanilla file first, the brand's on top, so an untranslated key keeps its default.
const localeFiles = (code: string): string[] =>
  has(`app/locales/${code}.json`) ? [`${code}.json`, `../app/locales/${code}.json`] : [`${code}.json`];

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  devServer: { host: "0.0.0.0" },
  modules: ["@nuxt/eslint", "@nuxtjs/i18n"],
  css: [
    "~/assets/css/branding.css",
    "~/assets/css/main.css",
    "@ocelot-social/ui/style.css",
    ...brandCss,
  ],
  i18n: {
    locales: [
      { code: "en", name: "English", files: localeFiles("en") },
      { code: "de", name: "Deutsch", files: localeFiles("de") },
      { code: "es", name: "Español", files: localeFiles("es") },
      { code: "fr", name: "Français", files: localeFiles("fr") },
      { code: "it", name: "Italiano", files: localeFiles("it") },
      { code: "nl", name: "Nederlands", files: localeFiles("nl") },
      { code: "pl", name: "Polski", files: localeFiles("pl") },
      { code: "pt", name: "Português", files: localeFiles("pt") },
      { code: "ru", name: "Русский", files: localeFiles("ru") },
      { code: "sq", name: "Shqip", files: localeFiles("sq") },
      { code: "uk", name: "Українська", files: localeFiles("uk") },
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
      minify: 'esbuild',
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
