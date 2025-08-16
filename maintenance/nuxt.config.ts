import sourcemaps from "rollup-plugin-sourcemaps";

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

  vite: {
    server: {
      sourcemapIgnoreList: (sourcePath: string, _sourcemapPath: string) => {
        // Ignore sourcemaps for files in the node_modules directory, except ocelot-styleguide
        if (sourcePath.includes("node_modules") && !sourcePath.includes("ocelot-styleguide")) {
          return true;
        }
        // Otherwise, include the sourcemap
        return false;
      },
    },
    build: {
      rollupOptions: {
        plugins: [sourcemaps()],
        output: {
          sourcemap: true,
          sourcemapIgnoreList: (sourcePath: string, _sourcemapPath: string) => {
            // Ignore sourcemaps for files in the node_modules directory, except ocelot-styleguide
            if (sourcePath.includes("node_modules") && !sourcePath.includes("ocelot-styleguide")) {
              return true;
            }
            // Otherwise, include the sourcemap
            return false;
          },
        },
      },
    },
  },
});
