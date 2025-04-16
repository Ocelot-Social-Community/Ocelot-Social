// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@nuxtjs/apollo',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],

  apollo: {
    clients: {
      default: {
        httpEndpoint: 'https://localhost:4000'
      }
    },
  },
})
