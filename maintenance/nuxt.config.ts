import { resolve } from "path";
import sourcemaps from "rollup-plugin-sourcemaps";
import viteTsConfigPaths from "vite-tsconfig-paths";
import locales from "./i18n/locales";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxtjs/apollo",
    "@pinia/nuxt",
    "@nuxtjs/i18n",
  ],

  apollo: {
    clients: {
      default: {
        httpEndpoint: "https://localhost:4000",
      },
    },
  },

  i18n: {
    locales: locales.map((locale: typeof locales[0]) => ({
      code: locale.code,
      language: locale.name,
      file: `${locale.code}.json`,
    })),
    defaultLocale: "en",
    compilation: {
      strictMessage: false,
    },
    bundle: {
      optimizeTranslationDirective: false,
    }
  },

  vite: {
    plugins: [viteTsConfigPaths()],
    resolve: {
      alias: {
        "@@": resolve(__dirname, "./lib/styleguide"),
      },
    },
    build: {
      rollupOptions: {
        plugins: [sourcemaps],
        output: {
          sourcemap: true,
        },
      },
    },
  },
});
